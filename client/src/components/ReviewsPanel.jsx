import { useEffect, useState } from "react";
import Field from "./ui/Field";
import Input from "./ui/Input";
import Textarea from "./ui/Textarea";
import Button from "./ui/Button";
import { API_BASE } from "../lib/api";

export default function ReviewsPanel({ bookId, token, onChanged }) {
    const [reviews, setReviews] = useState([]);
    const [rating, setRating] = useState(4.5);
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let stop = false;
        fetch(`${API_BASE}/api/reviews/by-book/${bookId}`)
            .then((r) => r.json()).then((d) => !stop && setReviews(d));
        return () => { stop = true; };
    }, [bookId]);

    async function addReview() {
        setBusy(true);
        const res = await fetch(`${API_BASE}/api/reviews`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ book: bookId, rating: Number(rating), title, body }),
        });
        setBusy(false);
        if (res.ok) {
            setTitle(""); setBody("");
            const fresh = await fetch(`${API_BASE}/api/reviews/by-book/${bookId}`).then((r) => r.json());
            setReviews(fresh);
            onChanged?.();
        } else {
            const err = await res.json().catch(() => ({}));
            alert("Erreur: " + (err.error || res.statusText));
        }
    }

    return (
        <div>
            <h3 className="section-title">Avis</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {reviews?.length ? reviews.map((rv) => (
                    <div key={rv._id} className="box">
                        <div className="small" style={{ fontWeight: 600 }}>★ {rv.rating} — {rv.title || "(Sans titre)"}</div>
                        <div className="small" style={{ whiteSpace: "pre-wrap" }}>{rv.body}</div>
                        <div className="muted">par {rv.user?.name || "Anonyme"}</div>
                    </div>
                )) : <div className="muted">Pas encore d'avis</div>}
            </div>

            {token ? (
                <div className="hr-top">
                    <h4 className="section-title">Ajouter un avis</h4>
                    <div className="grid-2">
                        <Field label="Note (0.5–5)">
                            <Input type="number" step="0.5" min="0.5" max="5" value={rating} onChange={(e) => setRating(e.target.value)} />
                        </Field>
                        <Field label="Titre"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
                    </div>
                    <Field label="Commentaire"><Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
                    <Button onClick={addReview} disabled={busy}>Publier l'avis</Button>
                </div>
            ) : <div className="muted mt-8">Connecte-toi pour publier un avis.</div>}
        </div>
    );
}
