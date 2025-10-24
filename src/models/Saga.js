import mongoose from "mongoose";

const sagaSchema = new mongoose.Schema({
    // Titre de la saga (ex: "La Passe-Miroir")
    title: { type: String, required: true, trim: true },
    // Auteur·rice(s) de la saga (ex: "Christelle Dabos")
    authors: [{ type: String }],

    // Catégories (mêmes Tag que pour Book)
    genres: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }],
    tropes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }],
    triggers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }],
    ages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }],

    // Livres appartenant à la saga
    books: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
}, { timestamps: true });

sagaSchema.index({ title: 1 });

export default mongoose.model("Saga", sagaSchema);
