export function formatDate(d) {
    if (!d) return "";
    const date = new Date(d);
    if (Number.isNaN(+date)) return "";
    // JJ/MM/AAAA (fr-FR)
    return date.toLocaleDateString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function isFutureDate(d) {
    if (!d) return false;
    const date = new Date(d);
    if (Number.isNaN(+date)) return false;
    const today = new Date();
    date.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return date.getTime() > today.getTime();
}
