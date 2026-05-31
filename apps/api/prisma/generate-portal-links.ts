import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

function makeToken(candidateId: string): string {
  const secret = process.env.JWT_SECRET || 'certmanager-secret'
  return createHash('sha256').update(candidateId + secret).digest('hex').slice(0, 32)
}

async function main() {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

  const candidates = await prisma.candidate.findMany({
    where: {
      status: { not: 'dropped' },
      email: { not: null },
    },
    select: {
      id: true, candidateRef: true, firstName: true, lastName: true,
      email: true, nativeLanguage: true, languagePair: true, status: true,
    },
    orderBy: { candidateRef: 'asc' },
  })

  console.log(JSON.stringify(candidates.map(c => ({
    ...c,
    token: makeToken(c.id),
    portalUrl: `${baseUrl}/portal/${c.id}/${makeToken(c.id)}`,
  }))))
}

main().catch(console.error).finally(() => prisma.$disconnect())
