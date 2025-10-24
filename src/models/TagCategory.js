import mongoose from "mongoose";

const tagCategorySchema = new mongoose.Schema({
    // ex: "Genres", "Tropes", "Triggers", "Ages"
    name: { type: String, required: true, trim: true },
    // clé technique stable pour filtrer: "genres" | "tropes" | "triggers" | "ages"
    key: { type: String, required: true, lowercase: true, unique: true },
    // owner null => catégorie système (par défaut) ; sinon catégorie privée d’un user (si plus tard tu veux)
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

export default mongoose.model("TagCategory", tagCategorySchema);
