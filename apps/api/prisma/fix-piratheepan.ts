import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  await prisma.candidate.update({
    where: { candidateRef: 'SP-2026-011' },
    data: {
      email:        'sinthujaya.piratheepan@outlook.com',
      phone:        '0176 72663575',
      fullAddress:  'Galgenberg 77, 34346 Hann. Münden',
      dateOfBirth:  new Date('1989-08-29'),
      deutschLevel: 'Muttersprache',
      educationLevel: 'Fachabitur Wirtschaft & Verwaltung (Note 2,5, 2011) + Kauffrau Groß-/Außenhandel IHK (84%, 2019). Studium Wirtschaftswiss. Uni Kassel (abgebrochen 2013).',
      notes: (await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-011' }, select: { notes: true } }))?.notes
        + `\n\n[31.05.2026 — CV gelesen]:
E-Mail: sinthujaya.piratheepan@outlook.com | Tel: 0176 72663575
Adresse: Galgenberg 77, 34346 Hann. Münden
Geb: 29.08.1989, Jaffna (Sri Lanka)
Staatsangehörigkeit: DEUTSCH ✅
Familienstand: verheiratet, 3 Kinder
Deutsch: MUTTERSPRACHLICH (seit Kindheit in DE)
Tamil: Muttersprachlich, Tamilische Schule bis Klasse 12
Aktuell: Stellv. Kassenleitung Stadtkasse Stadt Hann. Münden (seit 06/2024)`,
    },
  })
  console.log('✅ Piratheepan: sinthujaya.piratheepan@outlook.com | 0176 72663575 | Deutsche Staatsbürgerin')
}
main().catch(console.error).finally(() => prisma.$disconnect())
