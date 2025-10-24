import mongoose from "mongoose";

const tagSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true }, // "Romance", "SF", "Dark Academia", etc.
    category: { type: mongoose.Schema.Types.ObjectId, ref: "TagCategory", required: true },
    // owner null => tag “par défaut” fourni par le système ; sinon tag privé créé par l’utilisateur
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

tagSchema.index({ name: 1, category: 1, owner: 1 }, { unique: true });

export default mongoose.model("Tag", tagSchema);
