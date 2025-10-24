import Tag from "../models/Tag.js";
import TagCategory from "../models/TagCategory.js";

const DATA = {
    genres: ["Romance", "Fantasy", "SF", "Thriller", "Historique", "Contemporain", "Dark Academia"],
    tropes: ["Enemies to Lovers", "Friends to Lovers", "Fake Dating", "Found Family", "Slow Burn"],
    triggers: ["Violence", "Abus", "Deuil", "Autodestruction", "Contenu sexuel explicite"],
    ages: ["Young Adult", "New Adult", "Adulte", "50+"],
};

export async function seedDefaultTags() {
    const cats = await TagCategory.find({ key: { $in: Object.keys(DATA) } }).lean();
    const byKey = Object.fromEntries(cats.map(c => [c.key, c]));

    for (const [key, names] of Object.entries(DATA)) {
        const cat = byKey[key];
        if (!cat) continue;
        for (const name of names) {
            await Tag.updateOne(
                { name, category: cat._id, owner: null },
                { $setOnInsert: { name, category: cat._id, owner: null } },
                { upsert: true }
            );
        }
    }
    console.log("✅ Tags par défaut seedés.");
}
