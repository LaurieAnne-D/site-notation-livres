import { useEffect, useState } from "react";
import Box from "./ui/Box";
import ReviewsPanel from "./ReviewsPanel";
import ReadingPanel from "./ReadingPanel";
import BookTagSelector from "./BookTagSelector";
import { API_BASE } from "../lib/api";

export default function BookDetail({ book, token, onRefreshBook }) {
    const [full, setFull] = useState(book);

    async function load() {
        const d = await fetch(`${API_BASE}/api/books/${book._id}?populate=1`).then(r => r.json());
        setFull(d);
    }
    useEffect(() => { let stop = false; (async () => { const d = await fetch(`${API_BASE}/api/books/${book._id}?populate=1`).then(r => r.json()); if (!stop) setFull(d); })(); return () => { stop = true; }; }, [book._id]);

    return (
        <Box>
            <div className="mb-8" style={{ display: "flex", justifyContent: "space-between" }}>
                <h2 className="title">{full.title}</h2>
                <div className="muted">★ {full.avgRating?.toFixed?.(2) || 0}</div>
            </div>

            <div className="small">{(full.authors || []).join(", ")}</div>
            <div className="muted mb-12">Tags libres: {(full.tags || []).join(", ") || "—"} • Statut: {full.status}</div>

            <div className="muted mb-12">
                Genres: {(full.genres || []).map(t => t.name || t).join(", ") || "—"} •
                Tropes: {(full.tropes || []).map(t => t.name || t).join(", ") || "—"} •
                Triggers: {(full.triggers || []).map(t => t.name || t).join(", ") || "—"} •
                Âges: {(full.ages || []).map(t => t.name || t).join(", ") || "—"}
            </div>

            <div className="mb-12">
                <BookTagSelector
                    token={token}
                    bookId={book._id}
                    book={full}
                    onChanged={async () => { await load(); onRefreshBook?.(); }}
                />
            </div>

            <div className="grid-2">
                <ReviewsPanel bookId={book._id} token={token} onChanged={async () => { await load(); onRefreshBook?.(); }} />
                <ReadingPanel bookId={book._id} token={token} />
            </div>
        </Box>
    );
}

