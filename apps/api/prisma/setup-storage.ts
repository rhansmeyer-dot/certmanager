/**
 * One-time setup: create the private candidate-documents bucket in Supabase Storage
 * via the Storage REST API. Idempotent. Run once after SUPABASE_URL +
 * SUPABASE_SERVICE_KEY are set:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx prisma/setup-storage.ts
 */
import { DOCUMENTS_BUCKET } from '../src/lib/storage'

async function main() {
  const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_KEY || ''
  if (!base || !key) {
    console.log('❌ SUPABASE_URL / SUPABASE_SERVICE_KEY not set — cannot create bucket.')
    process.exit(1)
  }
  const res = await fetch(`${base}/storage/v1/bucket`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: DOCUMENTS_BUCKET,
      name: DOCUMENTS_BUCKET,
      public: false,
      file_size_limit: 20 * 1024 * 1024,
    }),
  })
  if (res.ok) {
    console.log(`✅ Created private bucket "${DOCUMENTS_BUCKET}" (EU/Frankfurt).`)
    return
  }
  const text = await res.text().catch(() => '')
  if (res.status === 409 || /already exists/i.test(text)) {
    console.log(`✅ Bucket "${DOCUMENTS_BUCKET}" already exists.`)
    return
  }
  console.log(`❌ createBucket: ${res.status} ${text}`)
  process.exit(1)
}

main().catch((e) => { console.log('❌', e.message); process.exit(1) })
