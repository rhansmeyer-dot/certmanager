import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const candidates = await prisma.candidate.findMany({
    include: { bundesland: true },
    orderBy: { candidateRef: 'asc' },
  })
  console.log(JSON.stringify(candidates))
}
main().catch(console.error).finally(() => prisma.$disconnect())
