/**
 * Erstellt die ai_update_queue Tabelle direkt via SQL
 * (Fallback wenn prisma db push nicht funktioniert)
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Erstelle ai_update_queue Tabelle...')

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "AiQueueStatus" AS ENUM ('pending', 'applied', 'rejected');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ai_update_queue (
      id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "candidateId" TEXT NOT NULL REFERENCES candidates(id),
      message      TEXT NOT NULL,
      "authorName"  TEXT NOT NULL,
      status       "AiQueueStatus" NOT NULL DEFAULT 'pending',
      "appliedAt"   TIMESTAMPTZ,
      "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_ai_queue_candidate ON ai_update_queue("candidateId");
    CREATE INDEX IF NOT EXISTS idx_ai_queue_status ON ai_update_queue(status);
  `)

  console.log('✅ Tabelle ai_update_queue erstellt')

  // Test-Query
  const result = await prisma.$queryRaw`SELECT COUNT(*) FROM ai_update_queue`
  console.log('✅ Test-Query erfolgreich:', result)
}

main()
  .catch(err => { console.error('❌ Fehler:', err.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
