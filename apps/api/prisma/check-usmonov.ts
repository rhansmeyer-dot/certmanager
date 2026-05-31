import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const all = await p.candidate.findMany({
    select: { candidateRef: true, firstName: true, lastName: true, status: true, email: true, bundeslandId: true },
    orderBy: { candidateRef: 'asc' },
  })
  console.log('Total candidates:', all.length)
  all.forEach(c => console.log(`${c.candidateRef} | ${c.firstName} ${c.lastName} | ${c.status} | ${c.email ?? 'no email'}`))

  const usmonov = all.find(c => c.lastName.toLowerCase().includes('usmonov'))
  console.log('\nUsmonov:', usmonov ?? 'NOT FOUND')
}
main().catch(console.error).finally(() => p.$disconnect())
