import { Router } from "express";
import Joi from "joi";
import Tag from "../models/Tag.js";
import TagCategory from "../models/TagCategory.js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();

// Lister les catégories + leurs tags (par défaut + de l’utilisateur connecté si auth)
r.get("/categories", requireAuth, async (req, res, next) => {
    try {
        const cats = await TagCategory.find().sort({ name: 1 }).lean();
        const catIds = cats.map(c => c._id);

        // Tags par défaut (owner null) + tags perso de l’utilisateur
        const tags = await Tag.find({
            category: { $in: catIds },
            $or: [{ owner: null }, { owner: req.user.id }]
        }).sort({ name: 1 }).lean();

        // regrouper
        const byCat = Object.fromEntries(cats.map(c => [String(c._id), { ...c, tags: [] }]));
        tags.forEach(t => {
            const key = String(t.category);
            if (byCat[key]) byCat[key].tags.push(t);
        });

        res.json(Object.values(byCat));
    } catch (e) { next(e); }
});

// Créer un tag perso dans une catégorie (ex: ajouter "Romance" dans Genres si pas déjà)
r.post("/", requireAuth, async (req, res, next) => {
    try {
        const schema = Joi.object({
            name: Joi.string().min(1).required(),
            categoryKey: Joi.string().valid("genres", "tropes", "triggers", "ages").required()
        });
        const { value, error } = schema.validate(req.body);
        if (error) return res.status(400).json({ error: error.message });

        const category = await TagCategory.findOne({ key: value.categoryKey });
        if (!category) return res.status(404).json({ error: "Catégorie introuvable" });

        const created = await Tag.create({
            name: value.name.trim(),
            category: category._id,
            owner: req.user.id
        });
        res.status(201).json(created);
    } catch (e) {
        if (e.code === 11000) return res.status(409).json({ error: "Tag déjà existant dans cette catégorie" });
        next(e);
    }
});

// Supprimer un tag perso (seulement si propriétaire)
r.delete("/:id", requireAuth, async (req, res, next) => {
    try {
        const tag = await Tag.findOne({ _id: req.params.id, owner: req.user.id });
        if (!tag) return res.status(404).json({ error: "Tag introuvable ou non autorisé" });

        // (Optionnel) empêcher la suppression s'il est utilisé par des livres
        // const used = await Book.countDocuments({ $or: [
        //   { genres: tag._id }, { tropes: tag._id }, { triggers: tag._id }, { ages: tag._id }
        // ]});
        // if (used > 0) return res.status(400).json({ error: "Tag utilisé par des livres" });

        await tag.deleteOne();
        res.status(204).end();
    } catch (e) { next(e); }
});

export default r;
