import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('📥 Kontaktdaten aus Google Drive übernehmen...\n')

  // Markiza — E-Mail + Telefon aus CV gefunden
  await prisma.candidate.update({
    where: { candidateRef: 'SP-2026-006' },
    data: {
      email: 'mazane@gmail.com',
      phone: '0151 75035035',
      dateOfBirth: new Date('1981-04-15'),
      notes: (await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-006' }, select: { notes: true } }))?.notes
        + '\n\n[31.05.2026 — Google Drive CV]: E-Mail mazane@gmail.com, Tel 07622 6735244 / 0151 75035035. Geb. 15.04.1981. EU-Bürgerin (Lettland). 15 Jahre in DE.',
    },
  })
  console.log('✅ Markiza: mazane@gmail.com | 0151 75035035')

  // Juraev — aktualisierte Kontaktdaten (noch in Halle, nicht Planegg!)
  await prisma.candidate.update({
    where: { candidateRef: 'SP-2026-001' },
    data: {
      email:       'juraev.izzatillo@mail.de',
      phone:       '+49 176 70405977',
      dateOfBirth: new Date('1996-10-10'),
      fullAddress: 'Streiberstrasse 33, 06110 Halle',
      currentCity: 'Halle (Saale)',
      // Er ist noch in Halle — Bundesland zurück auf SA
      bundeslandId: (await prisma.bundeslandRule.findUnique({ where: { bundeslandCode: 'SA' } }))?.id,
      notes: (await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-001' }, select: { notes: true } }))?.notes
        + '\n\n[31.05.2026 — Google Drive]: Adresse HALLE bestätigt: Streiberstrasse 33, 06110 Halle. NICHT Planegg! Bundesland bleibt SA. E-Mail: juraev.izzatillo@mail.de | +49 176 70405977. Geb. 10.10.1996.',
    },
  })
  console.log('✅ Juraev: juraev.izzatillo@mail.de | +49 176 70405977 | Halle (SA) — NICHT Bayern!')

  // S. Hajo — Kontaktdaten gefunden
  const hajo = await prisma.candidate.findFirst({ where: { lastName: 'Hajo' } })
  if (hajo) {
    await prisma.candidate.update({
      where: { id: hajo.id },
      data: {
        firstName: 'Salman',
        email:     'salman.hajo@hotmail.com',
        phone:     '0157/56776175',
        fullAddress: 'Bochumer Str. 51, 44866 Bochum',
        currentCity: 'Bochum',
        dateOfBirth: new Date('1988-01-10'),
        deutschLevel: 'C2',
        educationLevel: 'Bachelor Englische Literatur & Sprache, Damaskus Universität (2011). C2-Deutschkurs (2024-2025) Europa-Universität Flensburg. Online-Lehrgang Übersetzer Arabisch/Deutsch (2022). CAT-Tools Kurs (2023).',
        notes: (await prisma.candidate.findUnique({ where: { id: hajo.id }, select: { notes: true } }))?.notes
          + '\n\n[31.05.2026 — Google Drive CV Salman Hajo]:\nGeb. 10.01.1988, Safar, Syrien. Verheiratet, 2 Kinder. Staatsbürgerschaft: Deutsch+Syrisch (DOPPELT!) ✅\nSprachen: Kurdisch (L1), Arabisch (2. Muttersprache), Englisch (fließend), Deutsch (fließend/C2)\nAktuell: Bochum. Weiterbildungsprogramm "Lehrkräfte Plus" Ruhr-Uni Bochum (01-03/2026).\nErfahrung: Sprachmittler, Übersetzer (Arabisch-Englisch), Englischlehrer, Kulturmittler.\nBESONDERS: Online-Lehrgang Übersetzer Arabisch/Deutsch (Köln, 2022) + C2 Deutsch!\nPotenzial: Arabisch/Kurdisch ↔ Deutsch in NRW (kein Gerichtsübersetzer nötig falls direkt beeidigt)',
      },
    })
    console.log('✅ Hajo Salman: salman.hajo@hotmail.com | 0157/56776175 | Bochum | Deutsch+Syrisch')
  }

  // Zusammenfassung
  const updated = await prisma.candidate.findMany({
    where: { candidateRef: { in: ['SP-2026-001', 'SP-2026-006'] } },
    select: { candidateRef: true, firstName: true, lastName: true, email: true, phone: true, currentCity: true },
  })
  console.log('\nAktualisierte Kandidaten:')
  updated.forEach(c => console.log(`  ${c.candidateRef}: ${c.firstName} ${c.lastName} | ${c.email} | ${c.phone} | ${c.currentCity}`))
  console.log('\n⚠️  WICHTIG: Juraev ist in HALLE (SA), NICHT in Planegg (BY)!')
  console.log('   → Bundesland zurück auf SA, OLG Naumburg zuständig')
}

main().catch(console.error).finally(() => prisma.$disconnect())
