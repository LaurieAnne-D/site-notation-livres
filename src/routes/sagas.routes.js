import { Router } from "express";
import Saga from "../models/Saga.js";
import Book from "../models/Book.js";
import { requireAuth } from "../middleware/auth.js";

// ↓ nécessaires pour valider qu’un tag appartient bien à la bonne catégorie
import Tag from "../models/Tag.js";
import TagCategory from "../models/TagCategory.js";

const r = Router();

/**
 * GET /api/sagas
 * Query:
 *  - q: recherche sur le titre
 *  - genres/tropes/triggers/ages: IDs de Tag (OU logique, $in)
 *  - sort: createdAt|-createdAt|title|-title
 *  - page/limit
 *  - populate=1 pour peupler catégories et livres
 */
r.get("/", async (req, res, next) => {
    try {
        const { q, sort = "-createdAt", page = 1, limit = 12, populate } = req.query;
        const filter = {};

        if (q) filter.title = { $regex: q, $options: "i" };

        const multiCat = ["genres", "tropes", "triggers", "ages"];
        for (const cat of multiCat) {
            const val = req.query[cat];
            if (val) {
                const ids = Array.isArray(val) ? val : [val];
                filter[cat] = { $in: ids };
            }
        }

        const allowedSort = new Set(["createdAt", "-createdAt", "title", "-title"]);
        const sortParam = allowedSort.has(sort) ? sort : "-createdAt";
        const direction = sortParam.startsWith("-") ? -1 : 1;
        const field = sortParam.replace(/^-/, "");
        const sortObj = { [field]: direction };

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
        const skip = (pageNum - 1) * limitNum;

        let qFind = Saga.find(filter).sort(sortObj).skip(skip).limit(limitNum);
        if (String(populate) === "1") {
            qFind = qFind.populate("genres tropes triggers ages").populate("books");
        }

        const [items, total] = await Promise.all([qFind, Saga.countDocuments(filter)]);
        res.json({ items, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
    } catch (e) { next(e); }
});

/** GET /api/sagas/:id?populate=1 */
r.get("/:id", async (req, res, next) => {
    try {
        let qFind = Saga.findById(req.params.id);
        if (String(req.query.populate) === "1") {
            qFind = qFind.populate("genres tropes triggers ages").populate("books");
        }
        const saga = await qFind;
        if (!saga) return res.status(404).json({ error: "Saga introuvable" });
        res.json(saga);
    } catch (e) { next(e); }
});

/** POST /api/sagas  (protégé) */
r.post("/", requireAuth, async (req, res, next) => {
    try {
        const {
            title,
            authors = [],
            genres = [], tropes = [], triggers = [], ages = [],
            books = [],
        } = req.body;
        if (!title) return res.status(400).json({ error: "title est requis" });

        const created = await Saga.create({ title, authors, genres, tropes, triggers, ages, books });
        res.status(201).json(created);
    } catch (e) { next(e); }
});

/** PATCH /api/sagas/:id  (protégé) */
r.patch("/:id", requireAuth, async (req, res, next) => {
    try {
        const allow = ["title", "authors", "genres", "tropes", "triggers", "ages", "books"];
        const up = {};
        for (const k of allow) if (k in req.body) up[k] = req.body[k];

        if (Object.keys(up).length === 0) return res.status(400).json({ error: "Aucun champ valide" });

        const updated = await Saga.findByIdAndUpdate(req.params.id, up, { new: true });
        if (!updated) return res.status(404).json({ error: "Saga introuvable" });
        res.json(updated);
    } catch (e) { next(e); }
});

/** POST /api/sagas/:id/books/:bookId  (ajouter un livre à la saga) */
r.post("/:id/books/:bookId", requireAuth, async (req, res, next) => {
    try {
        const saga = await Saga.findById(req.params.id);
        if (!saga) return res.status(404).json({ error: "Saga introuvable" });

        const book = await Book.findById(req.params.bookId);
        if (!book) return res.status(404).json({ error: "Livre introuvable" });

        await Saga.updateOne({ _id: saga._id }, { $addToSet: { books: book._id } });
        res.status(204).end();
    } catch (e) { next(e); }
});

/** DELETE /api/sagas/:id/books/:bookId  (retirer un livre de la saga) */
r.delete("/:id/books/:bookId", requireAuth, async (req, res, next) => {
    try {
        const saga = await Saga.findById(req.params.id);
        if (!saga) return res.status(404).json({ error: "Saga introuvable" });

        await Saga.updateOne({ _id: saga._id }, { $pull: { books: req.params.bookId } });
        res.status(204).end();
    } catch (e) { next(e); }
});

/* ============================================================================
   Endpoints granulaires : ajouter/retirer un Tag d'une catégorie de la saga
   - catKey ∈ { genres | tropes | triggers | ages }
   - Vérifie que le Tag appartient bien à la bonne catégorie
============================================================================ */

const CAT_KEYS = ["genres", "tropes", "triggers", "ages"];

// Vérifie qu’un tag (tagId) appartient à la catégorie (catKey)
async function ensureTagMatchesCategory(tagId, catKey) {
    const cat = await TagCategory.findOne({ key: catKey }).lean();
    if (!cat) throw new Error("Catégorie inconnue");
    const tag = await Tag.findOne({ _id: tagId, category: cat._id }).lean();
    return !!tag;
}

/** POST /api/sagas/:id/:catKey/:tagId  → ajoute un tag à la catégorie */
r.post("/:id/:catKey/:tagId", requireAuth, async (req, res, next) => {
    try {
        const { catKey, tagId } = req.params;
        if (!CAT_KEYS.includes(catKey)) {
            return res.status(400).json({ error: "catKey invalide (genres|tropes|triggers|ages)" });
        }

        const ok = await ensureTagMatchesCategory(tagId, catKey);
        if (!ok) return res.status(400).json({ error: "Tag invalide pour cette catégorie" });

        const upd = await Saga.updateOne(
            { _id: req.params.id },
            { $addToSet: { [catKey]: tagId } }
        );

        // Compat différentes versions Mongoose
        if ((upd.matchedCount ?? upd.n) === 0) {
            const exists = await Saga.findById(req.params.id).lean();
            if (!exists) return res.status(404).json({ error: "Saga introuvable" });
        }

        return res.status(204).end();
    } catch (e) { next(e); }
});

/** DELETE /api/sagas/:id/:catKey/:tagId  → retire un tag de la catégorie */
r.delete("/:id/:catKey/:tagId", requireAuth, async (req, res, next) => {
    try {
        const { catKey, tagId } = req.params;
        if (!CAT_KEYS.includes(catKey)) {
            return res.status(400).json({ error: "catKey invalide (genres|tropes|triggers|ages)" });
        }

        const upd = await Saga.updateOne(
            { _id: req.params.id },
            { $pull: { [catKey]: tagId } }
        );

        if ((upd.matchedCount ?? upd.n) === 0) {
            const exists = await Saga.findById(req.params.id).lean();
            if (!exists) return res.status(404).json({ error: "Saga introuvable" });
        }

        return res.status(204).end();
    } catch (e) { next(e); }
});

export default r;

