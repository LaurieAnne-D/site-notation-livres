const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4001";

export function authHeaders() {
    const token = localStorage.getItem("jwt");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(r, path, method) {
    if (!r.ok && r.status !== 204) {
        let err = {};
        try { err = await r.json(); } catch { }
        throw new Error(`${method} ${path} -> ${r.status} ${err.error || ""}`);
    }
    return r.status === 204 ? null : r.json();
}

export async function apiGet(path) {
    const r = await fetch(`${API_BASE}${path}`, { headers: { ...authHeaders() } });
    return handle(r, path, "GET");
}

export async function apiPost(path, body) {
    const r = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: body ? JSON.stringify(body) : null,
    });
    return handle(r, path, "POST");
}

export async function apiPatch(path, body) {
    const r = await fetch(`${API_BASE}${path}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
    });
    return handle(r, path, "PATCH");
}

export async function apiDelete(path) {
    const r = await fetch(`${API_BASE}${path}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
    });
    return handle(r, path, "DELETE");
}

export { API_BASE };

