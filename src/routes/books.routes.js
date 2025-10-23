import { Router } from "express";
import Book from "../models/Book.js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();

/**
 * GET /api/books
 * Query params:
 *  - q: recherche dans le titre (contains, case-insensitive)
 *  - tag: un ou plusieurs (?tag=fantasy&tag=SF) -> OU logique ($in)
 *  - status: "À lire" | "En cours" | "Terminé" | "Abandonné"
 *  - sort: createdAt|-createdAt|avgRating|-avgRating|title|-title
 *  - page: 1..n
 *  - limit: 1..50
 */
r.get("/", async (req, res, next) => {
    try {
        const {
            q,
            tag,
            status,
            sort = "-createdAt",
            page = 1,
            limit = 12
        } = req.query;

        // ---- Filtres ----
        const filter = {};
        if (q) filter.title = { $regex: q, $options: "i" };
        if (status) filter.status = status;
        if (tag) {
            // OU logique: au moins un des tags demandés
            const tags = Array.isArray(tag) ? tag : [tag];
            filter.tags = { $in: tags };
        }

        // ---- Tri (PATCH corrigé) ----
        const allowedSort = new Set([
            "createdAt", "-createdAt",
            "avgRating", "-avgRating",
            "title", "-title"
        ]);

        const sortParam = allowedSort.has(sort) ? sort : "-createdAt";
        const direction = sortParam.startsWith("-") ? -1 : 1;
        const field = sortParam.replace(/^-/, ""); // champ sans '-'
        const sortObj = { [field]: direction };

        // ---- Pagination ----
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));

        const [items, total] = await Promise.all([
            Book.find(filter)
                .sort(sortObj)
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum),
            Book.countDocuments(filter)
        ]);

        res.json({
            items,
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum)
        });
    } catch (e) {
        next(e);
    }
});

// GET /api/books/:id
r.get("/:id", async (req, res, next) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ error: "Livre introuvable" });
        res.json(book);
    } catch (e) {
        next(e);
    }
});

// POST /api/books (protégé)
r.post("/", requireAuth, async (req, res, next) => {
    try {
        const { title, authors = [], tags = [], status = "À lire" } = req.body;
        if (!title) return res.status(400).json({ error: "title est requis" });
        const created = await Book.create({ title, authors, tags, status });
        res.status(201).json(created);
    } catch (e) {
        next(e);
    }
});

export default r;


