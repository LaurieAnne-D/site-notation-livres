import { Router } from "express";
import Joi from "joi";
import ReadingEntry from "../models/ReadingEntry.js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();

const schema = Joi.object({
    book: Joi.string().required(),
    date: Joi.date().required(),
    pagesRead: Joi.number().min(0),
    minutes: Joi.number().min(0),
    note: Joi.string().allow(""),
    progress: Joi.number().min(0).max(100)
});

// Liste de MES entrées (récentes d'abord)
r.get("/", requireAuth, async (req, res, next) => {
    try {
        const items = await ReadingEntry.find({ user: req.user.id })
            .sort({ date: -1, createdAt: -1 });
        res.json(items);
    } catch (e) { next(e); }
});

// Créer une entrée
r.post("/", requireAuth, async (req, res, next) => {
    try {
        const { value, error } = schema.validate(req.body);
        if (error) return res.status(400).json({ error: error.message });
        const created = await ReadingEntry.create({ ...value, user: req.user.id });
        res.status(201).json(created);
    } catch (e) { next(e); }
});

export default r;
