import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../lib/api";

const CAT_KEYS = [
    { key: "genres", label: "Genres" },
    { key: "tropes", label: "Tropes" },
    { key: "triggers", label: "Triggers" },
    { key: "ages", label: "Âges" },
];

export default function BookTagSelector({ token, bookId, book, onChanged }) {
    const [cats, setCats] = useState([]);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    const selected = useMemo(() => {
        const m = new Map();
        for (const { key } of CAT_KEYS) {
            const ids = (book?.[key] || []).map(t => (typeof t === "string" ? t : t._id));
            m.set(key, new Set(ids));
        }
        return m;
    }, [book]);

    useEffect(() => {
        let stop = false;
        (async () => {
            try {
                const r = await fetch(`${API_BASE}/api/tags/categories`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                if (!r.ok) throw new Error("load fail");
                const data = await r.json();
                if (!stop) setCats(data);
            } catch (e) {
                if (!stop) setErr("Impossible de charger les catégories (auth ?)");
            }
        })();
        return () => { stop = true; };
    }, [token]);

    async function toggle(catKey, tagId, isSelected) {
        if (!token) return alert("Connecte-toi pour modifier les tags.");
        setBusy(true); setErr("");
        try {
            const url = `${API_BASE}/api/books/${bookId}/${catKey}/${tagId}`;
            const r = await fetch(url, { method: isSelected ? "DELETE" : "POST", headers: { Authorization: `Bearer ${token}` } });
            if (!r.ok && r.status !== 204) throw new Error("update failed");
            onChanged?.();
        } catch (e) {
            setErr("Action impossible (droits ? cat/tag ?)");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="selector">
            <div className="section-title">Catégories</div>
            {err && <div className="muted" style={{ color: "#b91c1c" }}>{err}</div>}
            {CAT_KEYS.map(({ key, label }) => {
                const cat = cats.find(c => c.key === key);
                const sel = selected.get(key) || new Set();
                return (
                    <div key={key} className="selector__group">
                        <div className="selector__title">{label}</div>
                        <div className="selector__tags">
                            {(cat?.tags || []).map(tag => {
                                const isOn = sel.has(tag._id);
                                return (
                                    <button
                                        key={tag._id}
                                        disabled={busy}
                                        onClick={() => toggle(key, tag._id, isOn)}
                                        className={`tag ${isOn ? "tag--on" : ""}`}
                                        title={isOn ? "Retirer" : "Ajouter"}
                                    >
                                        {tag.name}
                                    </button>
                                );
                            })}
                            {(!cat || (cat.tags || []).length === 0) && (
                                <div className="muted">Aucun tag par défaut</div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

