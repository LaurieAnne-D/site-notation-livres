// src/components/SagaDetail.jsx
import { useEffect, useMemo, useState } from "react";
import Box from "./ui/Box";
import Button from "./ui/Button";
import { API_BASE } from "../lib/api";

export default function SagaDetail({ sagaId, token, onChanged }) {
    const [saga, setSaga] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    // Chargement de la saga
    useEffect(() => {
        let stop = false;
        setBusy(true);
        setError("");
        fetch(`${API_BASE}/api/sagas/${sagaId}?populate=1`)
            .then((r) => r.json())
            .then((d) => !stop && setSaga(d))
            .catch((e) => !stop && setError(e.message))
            .finally(() => !stop && setBusy(false));
        return () => {
            stop = true;
        };
    }, [sagaId]);

    // ✅ Toujours au top-level (pas conditionnel)
    const selectedGenreIds = useMemo(
        () => new Set((saga?.genres || []).map((t) => (typeof t === "string" ? t : t._id))),
        [saga]
    );
    const selectedTropeIds = useMemo(
        () => new Set((saga?.tropes || []).map((t) => (typeof t === "string" ? t : t._id))),
        [saga]
    );
    const selectedTriggerIds = useMemo(
        () => new Set((saga?.triggers || []).map((t) => (typeof t === "string" ? t : t._id))),
        [saga]
    );
    const selectedAgeIds = useMemo(
        () => new Set((saga?.ages || []).map((t) => (typeof t === "string" ? t : t._id))),
        [saga]
    );

    // Helpers d’API
    async function toggleTag(catKey, tagId, selectedSet) {
        if (!token || !saga?._id) return;
        const method = selectedSet.has(tagId) ? "DELETE" : "POST";
        const res = await fetch(`${API_BASE}/api/sagas/${saga._id}/${catKey}/${tagId}`, {
            method,
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            const fresh = await fetch(`${API_BASE}/api/sagas/${saga._id}?populate=1`).then((r) => r.json());
            setSaga(fresh);
            onChanged?.();
        } else {
            const err = await res.json().catch(() => ({}));
            alert(err.error || res.statusText);
        }
    }

    if (busy && !saga) {
        return <Box><div className="muted">Chargement…</div></Box>;
    }
    if (error) {
        return <Box><div className="muted">Erreur: {error}</div></Box>;
    }
    if (!saga) {
        return <Box><div className="muted">Saga introuvable.</div></Box>;
    }

    return (
        <Box>
            <div className="section__head">
                <h2 className="title">{saga.title}</h2>
                <div className="muted small">{(saga.authors || []).join(", ") || "—"}</div>
            </div>

            <div className="stack-12">
                {/* Genres */}
                <section className="panel">
                    <div className="panel__title">Genres</div>
                    <div className="chips">
                        {(saga.allGenres || saga.genres || []).map((g) => {
                            const id = typeof g === "string" ? g : g._id;
                            const name = typeof g === "string" ? g : g.name;
                            const active = selectedGenreIds.has(id);
                            return (
                                <button
                                    key={id}
                                    className={`chip ${active ? "chip--active" : ""}`}
                                    onClick={() => toggleTag("genres", id, selectedGenreIds)}
                                >
                                    {name}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Tropes */}
                <section className="panel">
                    <div className="panel__title">Tropes</div>
                    <div className="chips">
                        {(saga.allTropes || saga.tropes || []).map((t) => {
                            const id = typeof t === "string" ? t : t._id;
                            const name = typeof t === "string" ? t : t.name;
                            const active = selectedTropeIds.has(id);
                            return (
                                <button
                                    key={id}
                                    className={`chip ${active ? "chip--active" : ""}`}
                                    onClick={() => toggleTag("tropes", id, selectedTropeIds)}
                                >
                                    {name}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Triggers */}
                <section className="panel">
                    <div className="panel__title">Triggers</div>
                    <div className="chips">
                        {(saga.allTriggers || saga.triggers || []).map((t) => {
                            const id = typeof t === "string" ? t : t._id;
                            const name = typeof t === "string" ? t : t.name;
                            const active = selectedTriggerIds.has(id);
                            return (
                                <button
                                    key={id}
                                    className={`chip ${active ? "chip--active" : ""}`}
                                    onClick={() => toggleTag("triggers", id, selectedTriggerIds)}
                                >
                                    {name}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Âges */}
                <section className="panel">
                    <div className="panel__title">Âges</div>
                    <div className="chips">
                        {(saga.allAges || saga.ages || []).map((t) => {
                            const id = typeof t === "string" ? t : t._id;
                            const name = typeof t === "string" ? t : t.name;
                            const active = selectedAgeIds.has(id);
                            return (
                                <button
                                    key={id}
                                    className={`chip ${active ? "chip--active" : ""}`}
                                    onClick={() => toggleTag("ages", id, selectedAgeIds)}
                                >
                                    {name}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Livres de la saga */}
                <section className="panel">
                    <div className="panel__title">Livres</div>
                    <div className="list">
                        {(saga.books || []).map((b) => (
                            <div key={b._id} className="list__item">
                                <div className="list__main">
                                    <div className="list__title">{b.title}</div>
                                    <div className="muted small">{(b.authors || []).join(", ") || "—"}</div>
                                </div>
                                {token && (
                                    <div className="row-8">
                                        <Button
                                            onClick={async () => {
                                                const res = await fetch(`${API_BASE}/api/sagas/${saga._id}/books/${b._id}`, {
                                                    method: "DELETE",
                                                    headers: { Authorization: `Bearer ${token}` },
                                                });
                                                if (res.ok) {
                                                    const fresh = await fetch(`${API_BASE}/api/sagas/${saga._id}?populate=1`).then((r) => r.json());
                                                    setSaga(fresh);
                                                    onChanged?.();
                                                }
                                            }}
                                        >
                                            Retirer
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {(saga.books || []).length === 0 && (
                            <div className="muted small">Aucun livre pour l’instant.</div>
                        )}
                    </div>
                </section>
            </div>
        </Box>
    );
}

