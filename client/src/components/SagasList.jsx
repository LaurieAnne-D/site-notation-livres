import { useEffect, useMemo, useState } from "react";
import Box from "./ui/Box";
import Button from "./ui/Button";
import Input from "./ui/Input";
import { API_BASE } from "../lib/api";

function names(arr) {
    // Convertit un tableau d’ObjectId ou d’objets { _id, name } → ["name", ...]
    return (arr || []).map((t) => (typeof t === "string" ? t : t?.name)).filter(Boolean);
}

/**
 * Liste des Sagas
 * - GET /api/sagas?populate=1&q=&sort=&page=&limit=
 * - Affiche catégories (genres/tropes/triggers/ages) peuplées
 * - “+ Ajouter” crée une saga minimale (titre demandé) — nécessite un token
 */
export default function SagasList({ token, onPickSaga }) {
    const [q, setQ] = useState("");
    const [sort, setSort] = useState("-createdAt");
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [data, setData] = useState({ items: [], total: 0, pages: 0 });
    const [busy, setBusy] = useState(false);

    const query = useMemo(() => {
        const p = new URLSearchParams();
        if (q) p.set("q", q);
        if (sort) p.set("sort", sort); // createdAt|-createdAt|title|-title
        p.set("page", String(page));
        p.set("limit", String(limit));
        p.set("populate", "1"); // ← IMPORTANT : on veut les noms des tags de catégorie
        return p.toString();
    }, [q, sort, page, limit]);

    useEffect(() => {
        let stop = false;
        setBusy(true);
        fetch(`${API_BASE}/api/sagas?${query}`)
            .then((r) => r.json())
            .then((d) => !stop && setData(d))
            .finally(() => !stop && setBusy(false));
        return () => { stop = true; };
    }, [query]);

    async function createQuickSaga() {
        const title = window.prompt("Titre de la saga ?");
        if (!title) return;
        if (!token) return alert("Il faut être connecté(e) pour créer une saga.");
        const res = await fetch(`${API_BASE}/api/sagas`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ title, authors: [] }),
        });
        if (res.ok) {
            const fresh = await fetch(`${API_BASE}/api/sagas?${query}`).then((r) => r.json());
            setData(fresh);
        } else {
            const err = await res.json().catch(() => ({}));
            alert("Échec de création: " + (err.error || res.statusText));
        }
    }

    return (
        <Box>
            <div className="mb-8" style={{ display: "flex", justifyContent: "space-between" }}>
                <h2 className="title">Sagas</h2>
                <Button onClick={createQuickSaga}>+ Ajouter</Button>
            </div>

            <div className="grid-4">
                <Input placeholder="Recherche (q)" value={q} onChange={(e) => setQ(e.target.value)} />
                <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="-createdAt">Plus récentes</option>
                    <option value="createdAt">Plus anciennes</option>
                    <option value="title">Titre A→Z</option>
                    <option value="-title">Titre Z→A</option>
                </select>
                <div className="pager">
                    <Button onClick={() => setPage(Math.max(1, page - 1))}>◀</Button>
                    <div className="muted">Page {page}/{Math.max(1, data.pages || 1)}</div>
                    <Button onClick={() => setPage(page + 1)}>▶</Button>
                </div>
                {/* Espace libre pour futurs filtres de catégories si besoin */}
                <div />
            </div>

            {busy ? (
                <div className="muted">Chargement…</div>
            ) : (
                <div className="cards-2">
                    {data.items?.map((s) => {
                        const g = names(s.genres).join(", ");
                        const trp = names(s.tropes).join(", ");
                        const trg = names(s.triggers).join(", ");
                        const ag = names(s.ages).join(", ");

                        return (
                            <div key={s._id} className="list-card" onClick={() => onPickSaga?.(s)}>
                                <div className="list-card__top">
                                    <div style={{ fontWeight: 600 }}>{s.title}</div>
                                    <div className="muted">{new Date(s.createdAt).toLocaleDateString()}</div>
                                </div>

                                <div className="small">{(s.authors || []).join(", ")}</div>

                                {/* Catégories peuplées */}
                                {g && <div className="muted mt-8">Genres: {g}</div>}
                                {trp && <div className="muted">Tropes: {trp}</div>}
                                {trg && <div className="muted">Triggers: {trg}</div>}
                                {ag && <div className="muted">Âges: {ag}</div>}

                                {/* Nombre de livres si présent (populate=1) */}
                                {Array.isArray(s.books) && (
                                    <div className="small mt-8">{s.books.length} livre(s) dans la saga</div>
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
