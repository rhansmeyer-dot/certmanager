import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const r = await prisma.candidate.update({
    where: { candidateRef: 'SP-2026-003' },
    data: { firstName: 'Herr' },
  })
  console.log(`✅ Fixed: ${r.firstName} ${r.lastName}`)
}
main().catch(console.error).finally(() => prisma.$disconnect())
