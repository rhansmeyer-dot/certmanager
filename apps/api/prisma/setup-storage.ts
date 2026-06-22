/**
 * One-time setup: create the private candidate-documents bucket in Supabase Storage.
 * Run once after SUPABASE_URL + SUPABASE_SERVICE_KEY are set:
 *   npx tsx prisma/setup-storage.ts
 */
import { getStorage, DOCUMENTS_BUCKET } from '../src/lib/storage'

async function main() {
  const s = getStorage()
  if (!s) {
    console.log('❌ SUPABASE_URL / SUPABASE_SERVICE_KEY not set — cannot create bucket.')
    process.exit(1)
  }
  const { data: buckets, error: listErr } = await s.storage.listBuckets()
  if (listErr) { console.log('❌ listBuckets:', listErr.message); process.exit(1) }
  if (buckets?.some(b => b.name === DOCUMENTS_BUCKET)) {
    console.log(`✅ Bucket "${DOCUMENTS_BUCKET}" already exists.`)
    return
  }
  const { error } = await s.storage.createBucket(DOCUMENTS_BUCKET, {
    public: false,
    fileSizeLimit: 20 * 1024 * 1024,
  })
  if (error) { console.log('❌ createBucket:', error.message); process.exit(1) }
  console.log(`✅ Created private bucket "${DOCUMENTS_BUCKET}" (EU/Frankfurt).`)
}

main().catch(e => { console.log('❌', e.message); process.exit(1) })
