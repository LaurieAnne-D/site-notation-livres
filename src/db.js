import mongoose from "mongoose";

export async function connectDB(uri) {
    await mongoose.connect(uri, { dbName: "readinglog" });
    console.log("✅ Mongo connecté");
}
