/**
 * Öffentliche Basis-URL zum Bauen von Links (Portal-Links, Passwort-Reset).
 *
 * ACHTUNG: FRONTEND_URL ist für CORS eine KOMMA-getrennte Liste erlaubter
 * Origins (z. B. "http://localhost:5173,https://certmanager-speak2.vercel.app").
 * Für Links brauchen wir daraus EINE saubere Basis — sonst entstehen kaputte
 * URLs wie "http://localhost:5173,https://…/portal/…".
 */
export function publicBaseUrl(): string {
  const explicit = process.env.PUBLIC_URL
  if (explicit) return explicit.trim().replace(/\/+$/, '')

  const raw = process.env.FRONTEND_URL || 'http://localhost:5173'
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
  // https-Origin bevorzugen (Produktion), sonst erster Eintrag.
  const chosen = parts.find(p => p.startsWith('https://')) || parts[0] || 'http://localhost:5173'
  return chosen.replace(/\/+$/, '')
}
