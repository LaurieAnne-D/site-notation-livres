import { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { API_BASE } from "../../lib/api";

export default function SagaPickerModal({ open, onClose, token, bookId, currentSaga, onPicked }) {
    const [q, setQ] = useState("");
    const [list, setList] = useState([]);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    // Création
    const [newTitle, setNewTitle] = useState("");
    const [newAuthors, setNewAuthors] = useState("");

    const headersAuth = useMemo(() => ({
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }), [token]);

    useEffect(() => {
        if (!open) return;
        let stop = false;
        async function fetchSagas() {
            setBusy(true);
            setErr("");
            try {
                const p = new URLSearchParams();
                if (q) p.set("q", q);
                p.set("limit", "10");
                const d = await fetch(`${API_BASE}/api/sagas?${p.toString()}`).then(r => r.json());
                if (!stop) setList(d.items || []);
            } catch (e) {
                if (!stop) setErr(e.message);
            } finally {
                if (!stop) setBusy(false);
            }
        }
        fetchSagas();
        return () => { stop = true; };
    }, [open, q]);

    async function attachSaga(sagaId) {
        if (!token) return alert("Connecte-toi d'abord.");
        setBusy(true); setErr("");
        try {
            // Définir la saga côté livre (synchronise aussi la saga.books)
            const res = await fetch(`${API_BASE}/api/books/${bookId}/saga`, {
                method: "PATCH",
                headers: headersAuth,
                body: JSON.stringify({ saga: sagaId }),
            });
            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                throw new Error(e.error || res.statusText);
            }
            onPicked?.(); // parent fera un refetch
            onClose?.();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    async function createAndAttach() {
        if (!token) return alert("Connecte-toi d'abord.");
        const title = newTitle.trim();
        if (!title) return alert("Titre de saga requis");

        setBusy(true); setErr("");
        try {
            const body = {
                title,
                authors: newAuthors
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
            };
            const res = await fetch(`${API_BASE}/api/sagas`, {
                method: "POST",
                headers: headersAuth,
                body: JSON.stringify(body),
            });
            const sg = await res.json();
            if (!res.ok) throw new Error(sg?.error || res.statusText);

            await attachSaga(sg._id);
        } catch (e) {
            setErr(e.message);
            setBusy(false);
        }
    }

    async function clearSaga() {
        if (!token) return alert("Connecte-toi d'abord.");
        if (!window.confirm("Retirer la saga de ce livre ?")) return;
        setBusy(true); setErr("");
        try {
            const res = await fetch(`${API_BASE}/api/books/${bookId}/saga`, {
                method: "DELETE",
                headers: headersAuth,
            });
            if (!res.ok && res.status !== 204) {
                const e = await res.json().catch(() => ({}));
                throw new Error(e.error || res.statusText);
            }
            onPicked?.();
            onClose?.();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Associer une saga"
            footer={
                <div className="row-8">
                    {currentSaga && <Button onClick={clearSaga} disabled={busy}>Retirer la saga</Button>}
                    <div style={{ flex: 1 }} />
                    <Button className="btn--ghost" onClick={onClose}>Annuler</Button>
                </div>
            }
        >
            <div className="stack-16">
                <div className="panel">
                    <div className="panel__title">Rechercher une saga existante</div>
                    <div className="row-8">
                        <Input placeholder="Nom de saga…" value={q} onChange={(e) => setQ(e.target.value)} />
                    </div>
                    {busy ? (
                        <div className="muted small mt-8">Chargement…</div>
                    ) : (
                        <div className="list mt-8">
                            {(list || []).map((s) => (
                                <div key={s._id} className="list__item">
                                    <div>
                                        <div className="list__title">{s.title}</div>
                                        <div className="muted small">{(s.authors || []).join(", ") || "—"}</div>
                                    </div>
                                    <Button onClick={() => attachSaga(s._id)} disabled={busy}>
                                        Associer
                                    </Button>
                                </div>
                            ))}
                            {!list?.length && <div className="muted small">Aucun résultat</div>}
                        </div>
                    )}
                </div>

                <div className="panel">
                    <div className="panel__title">Créer une nouvelle saga</div>
                    <div className="row-8">
                        <Input placeholder="Titre de la saga" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                        <Input placeholder="Auteur(s) (séparés par des virgules)" value={newAuthors} onChange={(e) => setNewAuthors(e.target.value)} />
                        <Button className="btn--primary" onClick={createAndAttach} disabled={busy}>Créer et associer</Button>
                    </div>
                </div>

                {err && <div className="muted small">Erreur : {err}</div>}
            </div>
        </Modal>
    );
}
