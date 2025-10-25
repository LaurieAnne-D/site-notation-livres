// src/components/BookDetail.js
import { useEffect, useState } from "react";
import Box from "./ui/Box";
import Button from "./ui/Button";
import { API_BASE } from "../lib/api";
import { formatDate, isFutureDate } from "../lib/dates";
import BookTagSelector from "./BookTagSelector";

// panneaux déjà existants
import ReviewsPanel from "./ReviewsPanel";
import ReadingPanel from "./ReadingPanel";

// nouveaux composants
import StatusSelect from "./books/StatusSelect";
import ReleaseEditor from "./books/ReleaseEditor";
import SagaPickerModal from "./sagas/SagaPickerModal";
import QuotesPanel from "./quotes/QuotesPanel";

function formatTagList(list) {
    return (list || [])
        .map((t) => (typeof t === "string" ? t : t?.name))
        .filter(Boolean)
        .join(", ");
}

export default function BookDetail({ book, token, onRefreshBook }) {
    const [full, setFull] = useState(book);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const [sagaOpen, setSagaOpen] = useState(false);

    async function refetch() {
        setBusy(true);
        setErr("");
        try {
            const d = await fetch(`${API_BASE}/api/books/${book._id}?populate=1`).then((r) => r.json());
            setFull(d);
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    useEffect(() => {
        let stop = false;
        (async () => {
            setBusy(true);
            setErr("");
            try {
                const d = await fetch(`${API_BASE}/api/books/${book._id}?populate=1`).then((r) => r.json());
                if (!stop) setFull(d);
            } catch (e) {
                if (!stop) setErr(e.message);
            } finally {
                if (!stop) setBusy(false);
            }
        })();
        return () => { stop = true; };
    }, [book._id]);

    if (err) {
        return (
            <Box>
                <div className="muted">Erreur : {err}</div>
            </Box>
        );
    }

    const releaseInfo = full?.releaseDate
        ? `${formatDate(full.releaseDate)}${isFutureDate(full.releaseDate) ? " (à venir)" : ""}`
        : "—";
    const genres = formatTagList(full?.genres);
    const tropes = formatTagList(full?.tropes);
    const triggers = formatTagList(full?.triggers);
    const ages = formatTagList(full?.ages);

    return (
        <Box>
            <div className="section__head">
                <h2 className="title">{full.title}</h2>
                <div className="muted small">★ {Number(full.avgRating || 0).toFixed(2)}</div>
            </div>

            <div className="muted">{(full.authors || []).join(", ")}</div>

            {/* Affichage de la date de sortie */}
            <div className="mt-8 small">
                <span className="muted">Date de sortie : </span>
                <span>{releaseInfo}</span>
            </div>

            {(genres || tropes || triggers || ages) && (
                <div className="stack-8 mt-16">
                    {genres && (
                        <div className="small">
                            <span className="muted">Genres : </span>
                            <span>{genres}</span>
                        </div>
                    )}
                    {tropes && (
                        <div className="small">
                            <span className="muted">Tropes : </span>
                            <span>{tropes}</span>
                        </div>
                    )}
                    {triggers && (
                        <div className="small">
                            <span className="muted">Trigger warnings : </span>
                            <span>{triggers}</span>
                        </div>
                    )}
                    {ages && (
                        <div className="small">
                            <span className="muted">Âges : </span>
                            <span>{ages}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Bloc Saga */}
            <div className="row-8 mt-12">
                <div className="small">
                    <span className="muted">Saga : </span>
                    {full.saga?.title || "—"}
                </div>
                <Button onClick={() => setSagaOpen(true)}>
                    {full.saga ? "Changer" : "Ajouter"} la saga
                </Button>
            </div>

            <div className="stack-12 mt-16">
                {/* Statut */}
                <StatusSelect
                    bookId={full._id}
                    value={full.status}
                    token={token}
                    onUpdated={async () => { await refetch(); onRefreshBook?.(); }}
                />

                {/* Date de sortie (édition) */}
                <ReleaseEditor
                    bookId={full._id}
                    releaseDate={full.releaseDate}
                    status={full.status}
                    token={token}
                    onUpdated={async () => { await refetch(); onRefreshBook?.(); }}
                />

                {/* Gestion des tags */}
                {full?._id && (
                    <BookTagSelector
                        bookId={full._id}
                        book={full}
                        token={token}
                        onChanged={async () => { await refetch(); onRefreshBook?.(); }}
                    />
                )}

                {/* Avis + Journal de lecture */}
                <div className="grid-2">
                    <div className="panel">
                        <ReviewsPanel
                            bookId={full._id}
                            token={token}
                            onChanged={async () => { await refetch(); onRefreshBook?.(); }}
                        />
                    </div>
                    <div className="panel">
                        <ReadingPanel bookId={full._id} token={token} />
                    </div>
                </div>
            </div>

            {/* Citations */}
            <div className="grid-2 mt-16">
                <div className="panel">
                    <QuotesPanel bookId={full._id} token={token} />
                </div>
                <div />
            </div>

            {busy && <div className="muted small mt-16">Mise à jour…</div>}

            {/* Modale Saga */}
            <SagaPickerModal
                open={sagaOpen}
                onClose={() => setSagaOpen(false)}
                token={token}
                bookId={full._id}
                currentSaga={full.saga}
                onPicked={async () => { await refetch(); onRefreshBook?.(); }}
            />
        </Box>
    );
}
