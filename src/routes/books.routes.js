import { Router } from "express";
import Book from "../models/Book.js";
import { requireAuth } from "../middleware/auth.js";

// ↓ nécessaires pour les endpoints granulaires (validation catégorie/tag)
import Tag from "../models/Tag.js";
import TagCategory from "../models/TagCategory.js";

const r = Router();

/**
 * GET /api/books
 * Query params:
 *  - q: recherche plein-texte sur le titre (contains, insensitive)
 *  - status: "À lire" | "En cours" | "Terminé" | "Abandonné"
 *  - tag: (héritage) tag libre simple — OU logique ($in)  ex: ?tag=fantasy&tag=SF
 *  - genres / tropes / triggers / ages: IDs de Tag — OU logique ($in)
 *      ex: ?genres=64...a1&genres=64...b2  (au moins un des tags match)
 *  - sort: createdAt | -createdAt | avgRating | -avgRating | title | -title
 *  - page: 1..n
 *  - limit: 1..50
 *  - populate: "1" pour peupler les noms de tags (genres/tropes/triggers/ages)
 */
r.get("/", async (req, res, next) => {
    try {
        const {
            q,
            status,
            tag,                           // (legacy) liste de strings libres
            sort = "-createdAt",
            page = 1,
            limit = 12,
            populate,
        } = req.query;

        /* ---------------------- Construction du filtre ---------------------- */
        const filter = {};

        // Recherche titre
        if (q) filter.title = { $regex: q, $options: "i" };

        // Statut
        if (status) filter.status = status;

        // (Legacy) tags libres: OU logique
        if (tag) {
            const tags = Array.isArray(tag) ? tag : [tag];
            filter.tags = { $in: tags };
        }

        // Filtres par catégories (IDs de Tag) : OU logique
        const multiCat = ["genres", "tropes", "triggers", "ages"];
        for (const cat of multiCat) {
            const val = req.query[cat];
            if (val) {
                const ids = Array.isArray(val) ? val : [val];
                filter[cat] = { $in: ids };
            }
        }

        /* --------------------------- Tri (corrigé) -------------------------- */
        const allowedSort = new Set([
            "createdAt", "-createdAt",
            "avgRating", "-avgRating",
            "title", "-title",
        ]);
        const sortParam = allowedSort.has(sort) ? sort : "-createdAt";
        const direction = sortParam.startsWith("-") ? -1 : 1;
        const field = sortParam.replace(/^-/, ""); // champ sans '-'
        const sortObj = { [field]: direction };

        /* ---------------------------- Pagination ---------------------------- */
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
        const skip = (pageNum - 1) * limitNum;

        /* ----------------------- Exécution de la requête -------------------- */
        const doPopulate = String(populate) === "1";

        let qFind = Book.find(filter).sort(sortObj).skip(skip).limit(limitNum);
        if (doPopulate) {
            // Peuple les références de catégories (affichage front plus simple)
            qFind = qFind.populate("genres tropes triggers ages");
        }

        const [items, total] = await Promise.all([
            qFind,
            Book.countDocuments(filter),
        ]);

        res.json({
            items,
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum),
        });
    } catch (e) {
        next(e);
    }
});

/**
 * GET /api/books/:id
 * Query:
 *  - populate=1 pour peupler les catégories
 */
r.get("/:id", async (req, res, next) => {
    try {
        const doPopulate = String(req.query.populate) === "1";
        let qFind = Book.findById(req.params.id);
        if (doPopulate) qFind = qFind.populate("genres tropes triggers ages");

        const book = await qFind;
        if (!book) return res.status(404).json({ error: "Livre introuvable" });
        res.json(book);
    } catch (e) {
        next(e);
    }
});

/**
 * POST /api/books  (protégé)
 * Body (exemples) :
 * {
 *   "title": "Dune",
 *   "authors": ["Frank Herbert"],
 *   "status": "À lire",
 *   "tags": ["SF"],                         // (legacy) optionnel
 *   "genres": ["<TagId>", "..."],           // ← nouvelles catégories (IDs de Tag)
 *   "tropes": ["<TagId>"],
 *   "triggers": ["<TagId>"],
 *   "ages": ["<TagId>"]
 * }
 */
r.post("/", requireAuth, async (req, res, next) => {
    try {
        const {
            title,
            authors = [],
            status = "À lire",
            // legacy
            tags = [],
            // nouvelles catégories (références à Tag)
            genres = [],
            tropes = [],
            triggers = [],
            ages = [],
        } = req.body;

        if (!title) return res.status(400).json({ error: "title est requis" });

        const created = await Book.create({
            title,
            authors,
            status,
            tags,        // si ton schema Book ne l'a plus, Mongoose ignorera
            genres,
            tropes,
            triggers,
            ages,
        });

        res.status(201).json(created);
    } catch (e) {
        next(e);
    }
});

/**
 * PATCH /api/books/:id  (protégé)
 * Body: n’importe lequel des champs ci-dessous (remplacement complet du champ)
 * {
 *   "title": "Nouveau titre?",
 *   "authors": ["..."],
 *   "status": "À lire|En cours|Terminé|Abandonné",
 *   "tags": ["..."],                 // (legacy)
 *   "genres": ["<TagId>", ...],
 *   "tropes": ["<TagId>", ...],
 *   "triggers": ["<TagId>", ...],
 *   "ages": ["<TagId>", ...]
 * }
 */
r.patch("/:id", requireAuth, async (req, res, next) => {
    try {
        const up = {};
        const allow = ["title", "authors", "status", "tags", "genres", "tropes", "triggers", "ages"];
        for (const k of allow) {
            if (k in req.body) up[k] = req.body[k];
        }
        if (Object.keys(up).length === 0) {
            return res.status(400).json({ error: "Aucun champ valide à mettre à jour" });
        }
        const updated = await Book.findByIdAndUpdate(req.params.id, up, { new: true });
        if (!updated) return res.status(404).json({ error: "Livre introuvable" });
        res.json(updated);
    } catch (e) { next(e); }
});

/* ============================================================================
   Endpoints granulaires : ajouter/retirer un Tag d'une catégorie du livre
   - catKey ∈ { genres | tropes | triggers | ages }
   - Vérifie que le Tag appartient bien à la bonne catégorie
============================================================================ */

const CAT_KEYS = ["genres", "tropes", "triggers", "ages"];

/**
 * Vérifie qu'un tag (tagId) appartient bien à la catégorie (catKey)
 * Retourne true si OK, false sinon
 */
async function ensureTagMatchesCategory(tagId, catKey) {
    const cat = await TagCategory.findOne({ key: catKey }).lean();
    if (!cat) throw new Error("Catégorie inconnue");
    const tag = await Tag.findOne({ _id: tagId, category: cat._id }).lean();
    return !!tag;
}

/**
 * POST /api/books/:id/:catKey/:tagId
 * Ajoute un tag (ID) à la catégorie du livre (addToSet)
 */
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

        // Compat versions Mongoose pour savoir si le livre existe
        if ((upd.matchedCount ?? upd.n) === 0) {
            const exists = await Book.findById(req.params.id).lean();
            if (!exists) return res.status(404).json({ error: "Livre introuvable" });
        }

        return res.status(204).end();
    } catch (e) { next(e); }
});

/**
 * DELETE /api/books/:id/:catKey/:tagId
 * Retire un tag (ID) de la catégorie du livre ($pull)
 */
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

        return res.status(204).end();
    } catch (e) { next(e); }
});

export default r;




