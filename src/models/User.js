import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
    favoritesSagas: [{ type: mongoose.Schema.Types.ObjectId, ref: "Saga" }]
}, { timestamps: true });
export default mongoose.model("User", userSchema);
