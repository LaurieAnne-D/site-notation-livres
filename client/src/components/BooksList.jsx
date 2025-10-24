import { useEffect, useMemo, useState } from "react";
import Box from "./ui/Box";
import Button from "./ui/Button";
import Input from "./ui/Input";
import { API_BASE } from "../lib/api";

function names(arr) {
    // Convertit un tableau d’ObjectId ou d’objets { _id, name } en noms
    return (arr || []).map((t) => (typeof t === "string" ? t : t?.name)).filter(Boolean);
}

export default function BooksList({ token, onPickBook }) {
    const [q, setQ] = useState("");
    const [tag, setTag] = useState("");           // (héritage) pour créer vite fait un livre
    const [status, setStatus] = useState("");
    const [sort, setSort] = useState("-createdAt");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [data, setData] = useState({ items: [], total: 0, pages: 0 });
    const [busy, setBusy] = useState(false);

    const query = useMemo(() => {
        const p = new URLSearchParams();
        if (q) p.set("q", q);
        if (status) p.set("status", status);
        if (sort) p.set("sort", sort);
        p.set("page", String(page));
        p.set("limit", String(limit));
        // IMPORTANT: on veut les noms des catégories
        p.set("populate", "1");
        return p.toString();
    }, [q, status, sort, page, limit]);

    useEffect(() => {
        let stop = false;
        setBusy(true);
        fetch(`${API_BASE}/api/books?${query}`)
            .then((r) => r.json())
            .then((d) => !stop && setData(d))
            .finally(() => !stop && setBusy(false));
        return () => { stop = true; };
    }, [query]);

    async function createQuickBook() {
        const title = window.prompt("Titre du livre ?");
        if (!title) return;
        // On garde 'tag' uniquement comme "tags libres (héritage)" si tu veux t’en servir
        const body = { title, authors: [], tags: tag ? [tag] : [], status: status || "À lire" };
        const headers = {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const res = await fetch(`${API_BASE}/api/books`, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });
        if (res.ok) {
            const fresh = await fetch(`${API_BASE}/api/books?${query}`).then((r) => r.json());
            setData(fresh);
        } else {
            alert("Échec création (token ?)");
        }
    }

    return (
        <Box>
            <div className="mb-8" style={{ display: "flex", justifyContent: "space-between" }}>
                <h2 className="title">Livres</h2>
                <Button onClick={createQuickBook}>+ Ajouter</Button>
            </div>

            <div className="grid-5">
                <Input placeholder="Recherche (q)" value={q} onChange={(e) => setQ(e.target.value)} />
                {/* Champ “Tag” réservé à l’héritage / création rapide */}
                <Input placeholder="Tag (libre, optionnel)" value={tag} onChange={(e) => setTag(e.target.value)} />
                <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">— Statut —</option>
                    <option>À lire</option>
                    <option>En cours</option>
                    <option>Terminé</option>
                    <option>Abandonné</option>
                </select>
                <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="-createdAt">Plus récents</option>
                    <option value="createdAt">Plus anciens</option>
                    <option value="-avgRating">Mieux notés</option>
                    <option value="avgRating">Moins bien notés</option>
                    <option value="title">Titre A→Z</option>
                    <option value="-title">Titre Z→A</option>
                </select>
                <div className="pager">
                    <Button onClick={() => setPage(Math.max(1, page - 1))}>◀</Button>
                    <div className="muted">Page {page}/{Math.max(1, data.pages || 1)}</div>
                    <Button onClick={() => setPage(page + 1)}>▶</Button>
                </div>
            </div>

            {busy ? (
                <div className="muted">Chargement…</div>
            ) : (
                <div className="cards-2">
                    {data.items?.map((b) => {
                        const g = names(b.genres).join(", ");
                        const trp = names(b.tropes).join(", ");
                        const trg = names(b.triggers).join(", ");
                        const ag = names(b.ages).join(", ");
                        const legacy = (b.tags || []).join(", "); // affichage optionnel

                        return (
                            <div key={b._id} className="list-card" onClick={() => onPickBook(b)}>
                                <div className="list-card__top">
                                    <div style={{ fontWeight: 600 }}>{b.title}</div>
                                    <div className="muted">{new Date(b.createdAt).toLocaleDateString()}</div>
                                </div>

                                <div className="small">{(b.authors || []).join(", ")}</div>

                                {/* Lignes d’infos */}
                                <div className="muted mt-8">Statut: {b.status}</div>
                                {g && <div className="muted mt-8">Genres: {g}</div>}
                                {trp && <div className="muted">Tropes: {trp}</div>}
                                {trg && <div className="muted">Triggers: {trg}</div>}
                                {ag && <div className="muted">Âges: {ag}</div>}

                                {/* (optionnel) tags libres hérités */}
                                {legacy && <div className="muted mt-8">Tags libres: {legacy}</div>}

                                {typeof b.avgRating === "number" && (
                                    <div className="small mt-8">★ {b.avgRating?.toFixed(2)}</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {data.total === 0 && !busy && <div className="muted mt-8">Aucun résultat</div>}
        </Box>
    );
}

