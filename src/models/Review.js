import mongoose from "mongoose";
const reviewSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true, index: true },
    rating: { type: Number, min: 0.5, max: 5, required: true },
    title: String,
    body: String,
    spoiler: { type: Boolean, default: false }
}, { timestamps: true });

// 1 avis par utilisateur et par livre
reviewSchema.index({ user: 1, book: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);
