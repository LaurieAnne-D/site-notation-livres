import mongoose from "mongoose";
const { Schema } = mongoose;

const QuoteSchema = new Schema(
    {
        text: { type: String, required: true, trim: true },
        page: { type: Number, min: 0 },
        favorite: { type: Boolean, default: false },
    },
    { _id: true, timestamps: true }
);

const BookSchema = new Schema(
    {
        title: { type: String, required: true, trim: true },
        authors: [{ type: String, trim: true }],
        // Catégories typées
        genres: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
        tropes: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
        triggers: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
        ages: [{ type: Schema.Types.ObjectId, ref: "Tag" }],

        // statut éditable dans la fiche
        status: {
            type: String,
            enum: ["À lire", "En cours", "Terminé", "Abandonné", "À paraître", "Wishlist"],
            default: "À lire",
        },

        // lien vers la saga
        saga: { type: Schema.Types.ObjectId, ref: "Saga", default: null },

        // date de sortie
        releaseDate: { type: Date, default: null },

        // citations
        quotes: [QuoteSchema],

        // moyenne avis (tu l’as déjà sans doute)
        avgRating: { type: Number, default: 0, min: 0, max: 5 },
    },
    { timestamps: true }
);

export default mongoose.model("Book", BookSchema);
