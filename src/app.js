// src/app.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { connectDB } from "./db.js";
import { seedTagCategories } from "./seed/tagCategories.seed.js";
import { seedDefaultTags } from "./seed/defaultTags.seed.js";
import booksRoutes from "./routes/books.routes.js";
import authRoutes from "./routes/auth.routes.js";
import reviewsRoutes from "./routes/reviews.routes.js";
import readingRoutes from "./routes/reading.routes.js";
import tagsRoutes from "./routes/tags.routes.js";
import favoritesRoutes from "./routes/favorites.routes.js";
import sagasRoutes from "./routes/sagas.routes.js";

const app = express();

/* ---------- CORS en premier ---------- */
const allowedOrigins = [
  process.env.FRONT_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS bloqué pour l’origine: ${origin}`));
  },
  credentials: true,
}));
app.options("*", cors());

/* ---------- Sécurité / parsing / logs ---------- */
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));

/* ---------- Routes ---------- */
app.use("/api/auth", authRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/reading", readingRoutes);
app.use("/api/tags", tagsRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/sagas", sagasRoutes);

// tests rapides
app.get("/", (_req, res) => res.send("API OK"));
app.get("/health", (_req, res) => res.json({ ok: true }));

// métier
app.use("/api/books", booksRoutes);

/* ---------- 404 API seulement ---------- */
app.use("/api", (_req, res) => res.status(404).json({ error: "Route API introuvable" }));

/* ---------- handler d’erreurs ---------- */
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err?.message?.startsWith("CORS bloqué")) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: "Erreur serveur" });
});

/* ---------- Démarrage ---------- */
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/readinglog";

connectDB(MONGO_URI).then(async () => {
  await seedTagCategories();
  await seedDefaultTags();
  app.listen(PORT, () => console.log(`🚀 API http://localhost:${PORT}`));
});


