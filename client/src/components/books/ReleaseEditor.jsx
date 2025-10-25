import { useMemo, useState } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { API_BASE } from "../../lib/api";

function toISODateInput(date) {
    try {
        if (!date) return "";
        const d = new Date(date);
        if (Number.isNaN(+d)) return "";
        return d.toISOString().slice(0, 10);
    } catch {
        return "";
    }
}

export default function ReleaseEditor({ bookId, releaseDate, status, token, onUpdated }) {
    const [val, setVal] = useState(toISODateInput(releaseDate));
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    const isFuture = useMemo(() => {
        if (!val) return false;
        const d = new Date(val);
        if (Number.isNaN(+d)) return false;
        const today = new Date();
        // normaliser à minuit pour comparaison simple
        d.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        return d.getTime() > today.getTime();
    }, [val]);

    async function saveRelease(nextVal) {
        if (!token) return alert("Connecte-toi d'abord.");
        setBusy(true);
        setErr("");
        try {
            const res = await fetch(`${API_BASE}/api/books/${bookId}/release`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ releaseDate: nextVal || null }),
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

    async function quickWishlist() {
        if (!token) return alert("Connecte-toi d'abord.");
        setBusy(true);
        setErr("");
        try {
            // 1) enregistrer la date si modifiée
            if (val !== toISODateInput(releaseDate)) {
                await fetch(`${API_BASE}/api/books/${bookId}/release`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ releaseDate: val || null }),
                });
            }
            // 2) basculer le statut en Wishlist
            const res2 = await fetch(`${API_BASE}/api/books/${bookId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: "Wishlist" }),
            });
            if (!res2.ok) {
                const e = await res2.json().catch(() => ({}));
                throw new Error(e.error || res2.statusText);
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
            <div className="panel__title">Date de sortie</div>
            <div className="row-8">
                <Input
                    type="date"
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                />
                <Button className="btn--primary" onClick={() => saveRelease(val)} disabled={busy}>
                    Enregistrer
                </Button>
                <Button onClick={() => { setVal(""); saveRelease(""); }} disabled={busy}>
                    Effacer
                </Button>
            </div>

            <div className="mt-16 muted small">
                {val
                    ? (isFuture
                        ? "Date future détectée — tu peux le passer en Wishlist."
                        : "Date passée ou du jour.")
                    : "Pas de date de sortie définie."}
            </div>

            {isFuture && (
                <div className="mt-16">
                    <Button onClick={quickWishlist} disabled={busy || status === "Wishlist"}>
                        Ajouter à la Wishlist
                    </Button>
                </div>
            )}

            {err && <div className="muted small mt-16">Erreur : {err}</div>}
        </div>
    );
}
