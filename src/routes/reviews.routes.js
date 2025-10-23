import { Router } from "express";
import Joi from "joi";
import mongoose from "mongoose";
import Review from "../models/Review.js";
import Book from "../models/Book.js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();

const schema = Joi.object({
    book: Joi.string().required(),
    rating: Joi.number().min(0.5).max(5).required(),
    title: Joi.string().allow(""),
    body: Joi.string().allow(""),
    spoiler: Joi.boolean().default(false)
});

async function recomputeAverage(bookId) {
    const _id = new mongoose.Types.ObjectId(bookId);
    const agg = await Review.aggregate([
        { $match: { book: _id } },
        { $group: { _id: "$book", avg: { $avg: "$rating" } } }
    ]);
    await Book.findByIdAndUpdate(bookId, { avgRating: agg[0]?.avg ?? 0 });
}

// Lister les avis d’un livre
r.get("/by-book/:bookId", async (req, res, next) => {
    try {
        const items = await Review.find({ book: req.params.bookId }).populate("user", "name");
        res.json(items);
    } catch (e) { next(e); }
});

// Créer un avis
r.post("/", requireAuth, async (req, res, next) => {
    try {
        const { value, error } = schema.validate(req.body);
        if (error) return res.status(400).json({ error: error.message });
        const created = await Review.create({ ...value, user: req.user.id });
        await recomputeAverage(value.book);
        res.status(201).json(created);
    } catch (e) { next(e); }
});

// Modifier mon avis
r.patch("/:id", requireAuth, async (req, res, next) => {
    try {
        const updated = await Review.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            req.body,
            { new: true }
        );
        if (updated) await recomputeAverage(updated.book);
        res.json(updated);
    } catch (e) { next(e); }
});

// Supprimer mon avis
r.delete("/:id", requireAuth, async (req, res, next) => {
    try {
        const rev = await Review.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (rev) await recomputeAverage(rev.book);
        res.status(204).end();
    } catch (e) { next(e); }
});

export default r;

