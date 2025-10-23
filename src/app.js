import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { connectDB } from "./db.js";
import booksRoutes from "./routes/books.routes.js";
import authRoutes from "./routes/auth.routes.js";
import reviewsRoutes from "./routes/reviews.routes.js";
import readingRoutes from "./routes/reading.routes.js";


const app = express();

// Middlewares généraux & sécurité
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use("/api/auth", authRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/reading", readingRoutes);

// Routes de test
app.get("/", (_req, res) => res.send("API OK"));
app.get("/health", (_req, res) => res.json({ ok: true }));

// Routes métier
app.use("/api/books", booksRoutes);

// Démarrage
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/readinglog";

// handler d’erreurs
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Erreur serveur" });
});


connectDB(MONGO_URI).then(() => {
  app.listen(PORT, () => console.log(`🚀 API http://localhost:${PORT}`));
});

