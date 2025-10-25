import { useState } from "react";
import Button from "../ui/Button";
import { BOOK_STATUSES } from "../../constants/books";
import { API_BASE } from "../../lib/api";

export default function StatusSelect({ bookId, value, token, onUpdated }) {
    const [status, setStatus] = useState(value || "À lire");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    async function save() {
        if (!token) return alert("Connecte-toi d'abord.");
        setBusy(true);
        setErr("");
        try {
            const res = await fetch(`${API_BASE}/api/books/${bookId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                throw new Error(e.error || res.statusText);
            }
            onUpdated?.();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="panel">
            <div className="panel__title">Statut du livre</div>
            <div className="row-8">
                <select
                    className="input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                >
                    {BOOK_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                <Button className="btn--primary" onClick={save} disabled={busy}>
                    Enregistrer
                </Button>
            </div>
            {err && <div className="muted small mt-16">Erreur : {err}</div>}
        </div>
    );
}
