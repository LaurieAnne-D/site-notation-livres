import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import User from "../models/User.js";
import Book from "../models/Book.js";
import Saga from "../models/Saga.js";

const r = Router();

/* ------------------------ FAVORIS LIVRES ------------------------ */

// GET /api/favorites  → livres favoris
r.get("/", requireAuth, async (req, res, next) => {
    try {
        const me = await User.findById(req.user.id).populate("favorites");
        res.json(me?.favorites || []);
    } catch (e) { next(e); }
});

// POST /api/favorites/:bookId  → ajouter livre
r.post("/:bookId", requireAuth, async (req, res, next) => {
    try {
        const book = await Book.findById(req.params.bookId);
        if (!book) return res.status(404).json({ error: "Livre introuvable" });
        await User.updateOne({ _id: req.user.id }, { $addToSet: { favorites: book._id } });
        res.status(204).end();
    } catch (e) { next(e); }
});

// DELETE /api/favorites/:bookId  → retirer livre
r.delete("/:bookId", requireAuth, async (req, res, next) => {
    try {
        await User.updateOne({ _id: req.user.id }, { $pull: { favorites: req.params.bookId } });
        res.status(204).end();
    } catch (e) { next(e); }
});

/* ------------------------ FAVORIS SAGAS ------------------------- */

// GET /api/favorites/sagas  → sagas favorites
r.get("/sagas", requireAuth, async (req, res, next) => {
    try {
        const me = await User.findById(req.user.id).populate("favoritesSagas");
        res.json(me?.favoritesSagas || []);
    } catch (e) { next(e); }
});

// POST /api/favorites/sagas/:sagaId  → ajouter saga
r.post("/sagas/:sagaId", requireAuth, async (req, res, next) => {
    try {
        const saga = await Saga.findById(req.params.sagaId);
        if (!saga) return res.status(404).json({ error: "Saga introuvable" });
        await User.updateOne({ _id: req.user.id }, { $addToSet: { favoritesSagas: saga._id } });
        res.status(204).end();
    } catch (e) { next(e); }
});

// DELETE /api/favorites/sagas/:sagaId  → retirer saga
r.delete("/sagas/:sagaId", requireAuth, async (req, res, next) => {
    try {
        await User.updateOne({ _id: req.user.id }, { $pull: { favoritesSagas: req.params.sagaId } });
        res.status(204).end();
    } catch (e) { next(e); }
});

export default r;

