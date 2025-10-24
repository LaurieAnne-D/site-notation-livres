import { useEffect, useState } from "react";
import Field from "./ui/Field";
import Input from "./ui/Input";
import Textarea from "./ui/Textarea";
import Button from "./ui/Button";
import { API_BASE } from "../lib/api";

export default function ReadingPanel({ bookId, token }) {
    const [items, setItems] = useState([]);
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [pagesRead, setPagesRead] = useState(0);
    const [minutes, setMinutes] = useState(0);
    const [progress, setProgress] = useState("");
    const [note, setNote] = useState("");

    useEffect(() => {
        if (!token) { setItems([]); return; }
        let stop = false;
        fetch(`${API_BASE}/api/reading`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json()).then((d) => !stop && setItems(d));
        return () => { stop = true; };
    }, [token]);

    async function addEntry() {
        if (!token) return alert("Connecte-toi d'abord");
        const body = {
            book: bookId, date,
            pagesRead: Number(pagesRead) || 0,
            minutes: Number(minutes) || 0,
            progress: progress === "" ? undefined : Number(progress),
            note,
        };
        const res = await fetch(`${API_BASE}/api/reading`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
        });
        if (res.ok) {
            const fresh = await fetch(`${API_BASE}/api/reading`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
            setItems(fresh); setPagesRead(0); setMinutes(0); setProgress(""); setNote("");
        } else {
            const err = await res.json().catch(() => ({}));
            alert("Erreur: " + (err.error || res.statusText));
        }
    }

    const perBook = items.filter((it) => it.book === bookId || it.book?._id === bookId);

    return (
        <div>
            <h3 className="section-title">Journal de lecture</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflow: "auto", marginBottom: 8 }}>
                {perBook.length ? perBook.map((it) => (
                    <div key={it._id} className="box">
                        <div className="muted">
                            {new Date(it.date).toLocaleDateString()} — {it.minutes || 0} min • {it.pagesRead || 0} pages • {it.progress ?? "?"}%
                        </div>
                        {it.note && <div className="small" style={{ whiteSpace: "pre-wrap" }}>{it.note}</div>}
                    </div>
                )) : <div className="muted">Aucune entrée pour ce livre</div>}
            </div>

            {token ? (
                <div className="grid-2">
                    <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
                    <Field label="Pages lues"><Input type="number" value={pagesRead} onChange={(e) => setPagesRead(e.target.value)} /></Field>
                    <Field label="Minutes"><Input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></Field>
                    <Field label="Progression (%)">
                        <Input type="number" placeholder="laisser vide si inchangé" value={progress} onChange={(e) => setProgress(e.target.value)} />
                    </Field>
                    <div style={{ gridColumn: "1 / -1" }}><Field label="Note (facultatif)"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field></div>
                    <div style={{ gridColumn: "1 / -1" }}><Button onClick={addEntry}>Ajouter une entrée</Button></div>
                </div>
            ) : <div className="muted">Connecte-toi pour ajouter des entrées.</div>}
        </div>
    );
}
