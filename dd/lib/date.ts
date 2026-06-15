/**
 * Returns today's date in the user's LOCAL timezone as YYYY-MM-DD.
 * Fixes the UTC rollover bug: new Date().toISOString() shifts the day
 * for users east of UTC after local evening.
 */
export function getLocalYYYYMMDD(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return dt.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
