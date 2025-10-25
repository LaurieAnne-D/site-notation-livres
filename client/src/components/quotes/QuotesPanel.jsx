import { useEffect, useState } from "react";
import Box from "../ui/Box";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import { API_BASE } from "../../lib/api";

/**
 * Panneau des citations d’un livre :
 * - liste + étoile (favori global) + suppression
 * - formulaire d’ajout (auth requis)
 */
export default function QuotesPanel({ bookId, token, className = "" }) {
    const [items, setItems] = useState([]);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    // form
    const [text, setText] = useState("");
    const [page, setPage] = useState("");
    const [note, setNote] = useState("");

    async function load() {
        setBusy(true);
        setErr("");
        try {
            const data = await fetch(`${API_BASE}/api/quotes/by-book/${bookId}`).then((r) => r.json());
            setItems(Array.isArray(data) ? data : []);
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    useEffect(() => {
        if (!bookId) return;
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookId]);

    async function addQuote() {
        if (!token) return alert("Connecte-toi d'abord.");
        if (!text.trim()) return alert("La citation est vide.");

        setBusy(true);
        setErr("");
        try {
            const res = await fetch(`${API_BASE}/api/quotes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    book: bookId,
                    text: text.trim(),
                    page: page ? Number(page) : undefined,
                    note: note.trim() || undefined,
                }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d?.error || res.statusText);
            setText("");
            setPage("");
            setNote("");
            load();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    async function toggleFavorite(id, isFavorite) {
        if (!token) return alert("Connecte-toi d'abord.");
        setBusy(true);
        setErr("");
        try {
            const res = await fetch(`${API_BASE}/api/quotes/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ isFavorite: !isFavorite }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d?.error || res.statusText);
            }
            load();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    async function removeQuote(id) {
        if (!token) return alert("Connecte-toi d'abord.");
        if (!window.confirm("Supprimer cette citation ?")) return;
        setBusy(true);
        setErr("");
        try {
            const res = await fetch(`${API_BASE}/api/quotes/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok && res.status !== 204) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d?.error || res.statusText);
            }
            load();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <Box className={className}>
            <div className="section__head">
                <h3 className="title">Citations</h3>
                {busy && <div className="muted small">…</div>}
            </div>

            {err && <div className="muted small mb-8">Erreur : {err}</div>}

            {/* Liste */}
            <div className="stack-8 mb-12">
                {items.length === 0 ? (
                    <div className="muted small">Pas encore de citations.</div>
                ) : (
                    items.map((q) => (
                        <div key={q._id} className="quote">
                            <div className="quote__text">“{q.text}”</div>
                            <div className="quote__meta muted small">
                                {q.page ? <>p.{q.page} • </> : null}
                                {q.note ? <>{q.note} • </> : null}
                                {new Date(q.createdAt).toLocaleDateString()}
                            </div>
                            <div className="quote__actions">
                                <button
                                    className={`chip ${q.isFavorite ? "chip--on" : ""}`}
                                    onClick={() => toggleFavorite(q._id, q.isFavorite)}
                                    title={q.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                                >
                                    ★
                                </button>
                                <button className="chip chip--danger" onClick={() => removeQuote(q._id)} title="Supprimer">
                                    🗑
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Formulaire d’ajout */}
            <div className="panel">
                <div className="panel__title">Ajouter une citation</div>
                {token ? (
                    <div className="stack-8">
                        <Textarea
                            rows={3}
                            placeholder="La phrase exacte…"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                        <div className="row-8">
                            <Input
                                type="number"
                                placeholder="Page (optionnel)"
                                value={page}
                                onChange={(e) => setPage(e.target.value)}
                            />
                            <Input
                                placeholder="Note (optionnel)"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                            <Button onClick={addQuote} disabled={busy}>Ajouter</Button>
                        </div>
                    </div>
                ) : (
                    <div className="muted small">Connecte-toi pour ajouter des citations.</div>
                )}
            </div>
        </Box>
    );
}
