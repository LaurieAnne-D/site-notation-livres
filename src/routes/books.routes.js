import { Router } from "express";
import Book from "../models/Book.js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();

// Liste
r.get("/", async (_req, res, next) => {
    try {
        const items = await Book.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (e) { next(e); }
});

// Détail par ID
r.get("/:id", async (req, res, next) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ error: "Livre introuvable" });
        res.json(book);
    } catch (e) { next(e); }
});

// Création (protégée)
r.post("/", requireAuth, async (req, res, next) => {
    try {
        const { title, authors = [], tags = [], status = "À lire" } = req.body;
        if (!title) return res.status(400).json({ error: "title est requis" });
        const created = await Book.create({ title, authors, tags, status });
        res.status(201).json(created);
    } catch (e) { next(e); }
});

export default r;

