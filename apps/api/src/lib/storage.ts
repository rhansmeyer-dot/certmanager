/**
 * Supabase Storage helper — EU (Frankfurt) data residency for candidate documents.
 *
 * Uses the Storage REST API directly via native fetch (Node 18+). This deliberately
 * avoids @supabase/supabase-js on the server, because its bundled Realtime client
 * requires a global WebSocket (absent on Node 20) and we only need object storage.
 *
 * Server-side only: uses the SERVICE_ROLE / secret key, which bypasses RLS. NEVER
 * expose it to the frontend. The bucket is PRIVATE; access is via short-lived signed
 * URLs minted by the API after token verification.
 */
export const DOCUMENTS_BUCKET = 'candidate-documents'

const base = () => (process.env.SUPABASE_URL || '').replace(/\/$/, '')
const key  = () => process.env.SUPABASE_SERVICE_KEY || ''

export function storageConfigured(): boolean {
  return !!(base() && key())
}

/** Upload a file buffer to the private bucket. Returns { error } on failure. */
export async function uploadObject(
  path: string,
  body: Buffer,
  contentType?: string,
): Promise<{ error?: string }> {
  if (!storageConfigured()) return { error: 'storage not configured' }
  const url = `${base()}/storage/v1/object/${DOCUMENTS_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key()}`,
      apikey: key(),
      'Content-Type': contentType || 'application/octet-stream',
      'x-upsert': 'false',
    },
    body: new Uint8Array(body),
  })
  if (!res.ok) return { error: `${res.status} ${await res.text().catch(() => '')}` }
  return {}
}

/** Mint a short-lived signed URL for a private object. Returns { url } or { error }. */
export async function createSignedUrl(
  path: string,
  expiresIn = 120,
): Promise<{ url?: string; error?: string }> {
  if (!storageConfigured()) return { error: 'storage not configured' }
  const url = `${base()}/storage/v1/object/sign/${DOCUMENTS_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key()}`,
      apikey: key(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn }),
  })
  if (!res.ok) return { error: `${res.status} ${await res.text().catch(() => '')}` }
  const json = (await res.json()) as { signedURL?: string }
  if (!json.signedURL) return { error: 'no signedURL in response' }
  return { url: `${base()}/storage/v1${json.signedURL}` }
}
