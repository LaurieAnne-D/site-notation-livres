import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    authors: [{ type: String }],
    tags: [{ type: String }],
    status: { type: String, enum: ["À lire", "En cours", "Terminé", "Abandonné"], default: "À lire" },
    avgRating: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model("Book", bookSchema);
