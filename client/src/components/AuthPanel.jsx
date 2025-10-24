import { useState } from "react";
import Box from "./ui/Box";
import Button from "./ui/Button";
import Field from "./ui/Field";
import Input from "./ui/Input";
import Textarea from "./ui/Textarea";
import { API_BASE } from "../lib/api";

export default function AuthPanel({ token, setToken }) {
    const [mode, setMode] = useState("login");
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState("");

    async function call(path, body) {
        setBusy(true); setMsg("");
        try {
            const res = await fetch(`${API_BASE}${path}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || res.statusText);
            if (data?.token) {
                setToken(data.token);
                localStorage.setItem("jwt", data.token);
                setMsg("Connecté ✔");
            } else setMsg("OK");
        } catch (e) { setMsg("Erreur: " + e.message); }
        finally { setBusy(false); }
    }

    return (
        <Box className="mb-8">
            <div className="mb-8" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div className="muted">API:</div>
                <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 6, fontSize: 12 }}>
                    {API_BASE}
                </code>
            </div>

            {token ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div className="muted" style={{ wordBreak: "break-all", flex: 1 }}><b>JWT:</b> {token}</div>
                    <Button onClick={() => { setToken(""); localStorage.removeItem("jwt"); }}>Se déconnecter</Button>
                    <Button onClick={() => navigator.clipboard.writeText(token)}>Copier</Button>
                </div>
            ) : (
                <div className="grid-2">
                    <div>
                        <div className="mb-12" style={{ display: "flex", gap: 8 }}>
                            <Button variant={mode === "login" ? "primary" : undefined} onClick={() => setMode("login")}>Connexion</Button>
                            <Button variant={mode === "register" ? "primary" : undefined} onClick={() => setMode("register")}>Inscription</Button>
                        </div>

                        {mode === "register" && (
                            <Field label="Nom"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
                        )}
                        <Field label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
                        <Field label="Mot de passe"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>

                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {mode === "login" ? (
                                <Button disabled={busy} onClick={() => call("/api/auth/login", { email, password })}>Se connecter</Button>
                            ) : (
                                <Button disabled={busy} onClick={() => call("/api/auth/register", { name, email, password })}>Créer le compte</Button>
                            )}
                            {msg && <div className="muted">{msg}</div>}
                        </div>
                    </div>

                    <div>
                        <Field label="Coller un token JWT existant">
                            <Textarea rows={5} value={token} onChange={(e) => { setToken(e.target.value); localStorage.setItem("jwt", e.target.value); }} />
                        </Field>
                    </div>
                </div>
            )}
        </Box>
    );
}
