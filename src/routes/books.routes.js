// routes/books.routes.js
import { Router } from "express";
import Book from "../models/Book.js";
import { requireAuth } from "../middleware/auth.js";

// ↓ pour les endpoints granulaires catégories (validation)
import Tag from "../models/Tag.js";
import TagCategory from "../models/TagCategory.js";
// ↓ pour vérifier l'existence d'une saga lors du PATCH saga (optionnel mais propre)
import Saga from "../models/Saga.js";

const r = Router();

/* ============================================================================
   0) CITATIONS FAVORITES (homepage)
   GET /api/books/quotes/favorites?limit=20
   -> Retourne les citations (favorite=true) tous livres confondus
============================================================================ */
r.get("/quotes/favorites", async (req, res, next) => {
    try {
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
        const docs = await Book.aggregate([
            { $unwind: "$quotes" },
            { $match: { "quotes.favorite": true } },
            {
                $project: {
                    bookId: "$_id",
                    bookTitle: "$title",
                    quoteId: "$quotes._id",
                    text: "$quotes.text",
                    page: "$quotes.page",
                    createdAt: "$quotes.createdAt",
                },
            },
            { $sort: { createdAt: -1 } },
            { $limit: limit },
        ]);
        res.json(docs);
    } catch (e) { next(e); }
});

/* ============================================================================
   1) LISTE DES LIVRES
   GET /api/books
   Query:
    - q, status, tag (legacy)
    - genres/tropes/triggers/ages: $in IDs de Tag
    - sort: createdAt|-createdAt|avgRating|-avgRating|title|-title
    - page, limit, populate=1 (peuple genres/tropes/triggers/ages/saga)
============================================================================ */
r.get("/", async (req, res, next) => {
    try {
        const {
            q,
            status,
            tag,                           // (legacy) tag libre
            sort = "-createdAt",
            page = 1,
            limit = 12,
            populate,
        } = req.query;

        // ---- Filtres
        const filter = {};
        if (q) filter.title = { $regex: q, $options: "i" };
        if (status) filter.status = status;

        if (tag) {
            const tags = Array.isArray(tag) ? tag : [tag];
            filter.tags = { $in: tags };
        }

        const multiCat = ["genres", "tropes", "triggers", "ages"];
        for (const cat of multiCat) {
            const val = req.query[cat];
            if (val) {
                const ids = Array.isArray(val) ? val : [val];
                filter[cat] = { $in: ids };
            }
        }

        // ---- Tri
        const allowedSort = new Set([
            "createdAt", "-createdAt",
            "avgRating", "-avgRating",
            "title", "-title",
        ]);
        const sortParam = allowedSort.has(sort) ? sort : "-createdAt";
        const direction = sortParam.startsWith("-") ? -1 : 1;
        const field = sortParam.replace(/^-/, "");
        const sortObj = { [field]: direction };

        // ---- Pagination
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
        const skip = (pageNum - 1) * limitNum;

        // ---- Exécution
        const doPopulate = String(populate) === "1";
        let qFind = Book.find(filter).sort(sortObj).skip(skip).limit(limitNum);
        if (doPopulate) {
            qFind = qFind.populate("genres tropes triggers ages saga");
        }

        const [items, total] = await Promise.all([qFind, Book.countDocuments(filter)]);

        res.json({
            items,
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum),
        });
    } catch (e) { next(e); }
});

/* ============================================================================
   2) DETAIL LIVRE
   GET /api/books/:id?populate=1
============================================================================ */
r.get("/:id", async (req, res, next) => {
    try {
        const doPopulate = String(req.query.populate) === "1";
        let qFind = Book.findById(req.params.id);
        if (doPopulate) qFind = qFind.populate("genres tropes triggers ages saga");
        const book = await qFind;
        if (!book) return res.status(404).json({ error: "Livre introuvable" });
        res.json(book);
    } catch (e) { next(e); }
});

/* ============================================================================
   3) CREATION LIVRE (protégé)
   POST /api/books
============================================================================ */
r.post("/", requireAuth, async (req, res, next) => {
    try {
        const {
            title,
            authors = [],
            status = "À lire",
            genres = [],
            tropes = [],
            triggers = [],
            ages = [],
            saga = null,          // optionnel à la création
            releaseDate = null,   // optionnel
        } = req.body;

        if (!title) return res.status(400).json({ error: "title est requis" });

        // Optionnel: vérifie l'existence de la saga si fournie
        let sagaId = saga || null;
        if (sagaId) {
            const okSaga = await Saga.exists({ _id: sagaId });
            if (!okSaga) return res.status(400).json({ error: "Saga inexistante" });
        }

        const created = await Book.create({
            title,
            authors,
            status,
            genres,
            tropes,
            triggers,
            ages,
            saga: sagaId,
            releaseDate: releaseDate ? new Date(releaseDate) : null,
        });

        res.status(201).json(created);
    } catch (e) { next(e); }
});

/* ============================================================================
   4) MISE A JOUR GENERALE (protégé)
   PATCH /api/books/:id
   (Remplacement de champs complets)
============================================================================ */
r.patch("/:id", requireAuth, async (req, res, next) => {
    try {
        const up = {};
        const allow = [
            "title", "authors", "status",
            "genres", "tropes", "triggers", "ages",
            "saga", "releaseDate",
        ];
        for (const k of allow) {
            if (k in req.body) up[k] = req.body[k];
        }
        if ("saga" in up) {
            // null pour retirer, sinon vérifie existence
            if (up.saga) {
                const okSaga = await Saga.exists({ _id: up.saga });
                if (!okSaga) return res.status(400).json({ error: "Saga inexistante" });
            } else {
                up.saga = null;
            }
        }
        if ("releaseDate" in up) {
            up.releaseDate = up.releaseDate ? new Date(up.releaseDate) : null;
        }

        if (Object.keys(up).length === 0) {
            return res.status(400).json({ error: "Aucun champ valide à mettre à jour" });
        }
        const updated = await Book.findByIdAndUpdate(req.params.id, up, { new: true }).populate("saga");
        if (!updated) return res.status(404).json({ error: "Livre introuvable" });
        res.json(updated);
    } catch (e) { next(e); }
});

/* ============================================================================
   5) ENDPOINTS GRANULAIRES — STATUT / SAGA / DATE DE SORTIE
============================================================================ */

// PATCH /api/books/:id/status { status: "En cours" }
r.patch("/:id/status", requireAuth, async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!status) return res.status(400).json({ error: "status requis" });
        const updated = await Book.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!updated) return res.status(404).json({ error: "Livre introuvable" });
        res.json(updated);
    } catch (e) { next(e); }
});

// PATCH /api/books/:id/saga     Body: { saga: "<SagaId>" }  |  { saga: null }
r.patch("/:id/saga", requireAuth, async (req, res, next) => {
    try {
        const { saga } = req.body; // peut être string (ObjectId) ou null
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ error: "Livre introuvable" });

        const previousSagaId = book.saga?.toString() || null;

        // Si on passe une nouvelle saga, vérifier qu'elle existe
        let newSaga = null;
        if (saga) {
            newSaga = await Saga.findById(saga);
            if (!newSaga) return res.status(400).json({ error: "Saga inexistante" });
        }

        // 1) Si une ancienne saga était liée, la nettoyer
        if (previousSagaId) {
            await Saga.updateOne({ _id: previousSagaId }, { $pull: { books: book._id } });
        }

        // 2) Appliquer la nouvelle valeur côté Book (peut être null)
        book.saga = newSaga ? newSaga._id : null;
        await book.save();

        // 3) Si nouvelle saga, ajouter le livre côté Saga
        if (newSaga) {
            await Saga.updateOne({ _id: newSaga._id }, { $addToSet: { books: book._id } });
        }

        // 4) Retourner le livre peuplé
        const updated = await Book.findById(book._id).populate("saga");
        res.json(updated);
    } catch (e) {
        next(e);
    }
});

// DELETE /api/books/:id/saga
r.delete("/:id/saga", requireAuth, async (req, res, next) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ error: "Livre introuvable" });

        if (book.saga) {
            await Saga.updateOne({ _id: book.saga }, { $pull: { books: book._id } });
            book.saga = null;
            await book.save();
        }
        res.status(204).end();
    } catch (e) {
        next(e);
    }
});


// PATCH /api/books/:id/release { releaseDate: "2025-12-01" | null }
r.patch("/:id/release", requireAuth, async (req, res, next) => {
    try {
        const { releaseDate } = req.body;
        const value = releaseDate ? new Date(releaseDate) : null;
        const updated = await Book.findByIdAndUpdate(
            req.params.id,
            { releaseDate: value },
            { new: true }
        );
        if (!updated) return res.status(404).json({ error: "Livre introuvable" });
        res.json(updated);
    } catch (e) { next(e); }
});

/* ============================================================================
   6) ENDPOINTS GRANULAIRES — CATEGORIES (genres/tropes/triggers/ages)
============================================================================ */

const CAT_KEYS = ["genres", "tropes", "triggers", "ages"];

async function ensureTagMatchesCategory(tagId, catKey) {
    const cat = await TagCategory.findOne({ key: catKey }).lean();
    if (!cat) throw new Error("Catégorie inconnue");
    const tag = await Tag.findOne({ _id: tagId, category: cat._id }).lean();
    return !!tag;
}

// POST /api/books/:id/:catKey/:tagId  -> addToSet
r.post("/:id/:catKey/:tagId", requireAuth, async (req, res, next) => {
    try {
        const { catKey, tagId } = req.params;
        if (!CAT_KEYS.includes(catKey)) {
            return res.status(400).json({ error: "catKey invalide (genres|tropes|triggers|ages)" });
        }
        const ok = await ensureTagMatchesCategory(tagId, catKey);
        if (!ok) return res.status(400).json({ error: "Tag invalide pour cette catégorie" });

        const upd = await Book.updateOne(
            { _id: req.params.id },
            { $addToSet: { [catKey]: tagId } }
        );
        if ((upd.matchedCount ?? upd.n) === 0) {
            const exists = await Book.findById(req.params.id).lean();
            if (!exists) return res.status(404).json({ error: "Livre introuvable" });
        }
        res.status(204).end();
    } catch (e) { next(e); }
});

// DELETE /api/books/:id/:catKey/:tagId -> $pull
r.delete("/:id/:catKey/:tagId", requireAuth, async (req, res, next) => {
    try {
        const { catKey, tagId } = req.params;
        if (!CAT_KEYS.includes(catKey)) {
            return res.status(400).json({ error: "catKey invalide (genres|tropes|triggers|ages)" });
        }
        const upd = await Book.updateOne(
            { _id: req.params.id },
            { $pull: { [catKey]: tagId } }
        );
        if ((upd.matchedCount ?? upd.n) === 0) {
            const exists = await Book.findById(req.params.id).lean();
            if (!exists) return res.status(404).json({ error: "Livre introuvable" });
        }
        res.status(204).end();
    } catch (e) { next(e); }
});

/* ============================================================================
   7) CITATIONS (par livre)
============================================================================ */

// GET /api/books/:id/quotes
r.get("/:id/quotes", async (req, res, next) => {
    try {
        const book = await Book.findById(req.params.id).select("quotes title");
        if (!book) return res.status(404).json({ error: "Livre introuvable" });
        res.json(book.quotes || []);
    } catch (e) { next(e); }
});

// POST /api/books/:id/quotes  { text, page? }
r.post("/:id/quotes", requireAuth, async (req, res, next) => {
    try {
        const { text, page } = req.body;
        if (!text?.trim()) return res.status(400).json({ error: "text requis" });

        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ error: "Livre introuvable" });

        book.quotes.push({ text: text.trim(), page: typeof page === "number" ? page : undefined });
        await book.save();

        const created = book.quotes[book.quotes.length - 1];
        res.status(201).json(created);
    } catch (e) { next(e); }
});

// PATCH /api/books/:id/quotes/:qid  { text?, page?, favorite? }
r.patch("/:id/quotes/:qid", requireAuth, async (req, res, next) => {
    try {
        const { text, page, favorite } = req.body;
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ error: "Livre introuvable" });

        const q = book.quotes.id(req.params.qid);
        if (!q) return res.status(404).json({ error: "Citation introuvable" });

        if (typeof text === "string") q.text = text.trim();
        if (typeof page !== "undefined") q.page = page;
        if (typeof favorite !== "undefined") q.favorite = !!favorite;

        await book.save();
        res.json(q);
    } catch (e) { next(e); }
});

// DELETE /api/books/:id/quotes/:qid
r.delete("/:id/quotes/:qid", requireAuth, async (req, res, next) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ error: "Livre introuvable" });

        const q = book.quotes.id(req.params.qid);
        if (!q) return res.status(404).json({ error: "Citation introuvable" });

        q.deleteOne();
        await book.save();
        res.status(204).end();
    } catch (e) { next(e); }
});

export default r;





