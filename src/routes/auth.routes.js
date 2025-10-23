import { Router } from "express";
import Joi from "joi";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const r = Router();

r.post("/register", async (req, res) => {
    const schema = Joi.object({
        name: Joi.string().min(2).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required()
    });
    const { value, error } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const exists = await User.findOne({ email: value.email });
    if (exists) return res.status(409).json({ error: "Email déjà utilisé" });

    const passwordHash = await bcrypt.hash(value.password, 10);
    const user = await User.create({ ...value, passwordHash });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
});

r.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
        return res.status(401).json({ error: "Identifiants invalides" });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
});

export default r;
