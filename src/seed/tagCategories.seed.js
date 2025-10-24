import TagCategory from "../models/TagCategory.js";

export async function seedTagCategories() {
    const defs = [
        { name: "Genres", key: "genres" },
        { name: "Tropes", key: "tropes" },
        { name: "Triggers", key: "triggers" },
        { name: "Âges", key: "ages" },
    ];

    for (const d of defs) {
        await TagCategory.updateOne(
            { key: d.key },
            { $setOnInsert: { name: d.name, key: d.key, owner: null } },
            { upsert: true }
        );
    }
    console.log("✅ Catégories seedées");
}
