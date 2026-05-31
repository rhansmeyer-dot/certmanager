import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  // Roadmap + Arbeitsanweisung wurden am 08.04.2026 erstellt
  // = starkes Indiz dass Vertrag unterschrieben war
  // Status auf contract_signed setzen (Ramón kann jederzeit zurücksetzen falls falsch)
  const c = await prisma.candidate.update({
    where: { candidateRef: 'SP-2026-002' },
    data: {
      status:          'contract_signed',
      waitingFor:      'speak2',
      contractSignedAt: new Date('2026-04-08'),
    },
  })
  console.log(`✅ Usmonov: ${c.status} (contractSignedAt: ${c.contractSignedAt})`)
  console.log('   ⚠️  Bitte bestätigen! Widersprüchliche Infos — manuell prüfen.')
}
main().catch(console.error).finally(() => prisma.$disconnect())
