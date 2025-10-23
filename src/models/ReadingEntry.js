import mongoose from "mongoose";

const readingEntrySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    date: { type: Date, required: true },
    pagesRead: { type: Number, min: 0 },
    minutes: { type: Number, min: 0 },
    note: { type: String },
    progress: { type: Number, min: 0, max: 100 }
}, { timestamps: true });

readingEntrySchema.index({ user: 1, book: 1, date: -1 });

export default mongoose.model("ReadingEntry", readingEntrySchema);
