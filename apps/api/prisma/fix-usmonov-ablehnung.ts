import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: 'info@speak2.de' } })
  const c = await prisma.candidate.findUniqueOrThrow({ where: { candidateRef: 'SP-2026-002' } })

  await prisma.candidate.update({
    where: { candidateRef: 'SP-2026-002' },
    data: {
      status:    'contract_signed', // zurück auf contract_signed — Antrag abgelehnt, wartet auf Einbürgerung
      waitingFor: 'candidate',
      notes: (c.notes || '') + `

[21.05.2026 — LG AUGSBURG ABSAGE]:
Ivonne Kern (ivonne.kern@lg-a.bayern.de, LG Augsburg) hat den Antrag ABGELEHNT:
"Zwingende Voraussetzung die deutsche Staatsangehörigkeit ist.
Des Weiteren haben Sie keine Prüfung nach den vom Staatsministerium erlassenen
Vorschriften bestanden. Deshalb können wir Sie leider nicht beeidigen."

Usmonov's Antwort: "Im Laufe von 2 Monaten kriegen wir das hin"
→ Er erwartet Einbürgerung (Naturalisierung) in ca. Juli 2026!

WICHTIG: Sobald Einbürgerung abgeschlossen → Neuantrag LG Augsburg unter Ausnahmeregelung.
Ivonne Kern hat angeboten, Unterlagen an Geschäftsstellen weiterzuleiten (Notfalleinsätze).
E-Mail weitergeleitet an info@cundt.academy + diana@speak2.de am 21.05.2026.`,
    },
  })

  await prisma.pipelineEvent.create({
    data: {
      candidateId: c.id,
      fromStatus: 'certification_in_progress',
      toStatus: 'contract_signed',
      triggeredById: user.id,
      isAutomated: false,
      notes: 'LG Augsburg ABSAGE (21.05.2026): Fehlende deutsche Staatsbürgerschaft. Wartet auf Einbürgerung (~Juli 2026).',
      createdAt: new Date('2026-05-21'),
    },
  })

  // Dringender Task
  const dueDate = new Date('2026-07-01')
  await prisma.task.create({
    data: {
      candidateId:  c.id,
      title:        '🚨 Usmonov: Einbürgerung abwarten + Neuantrag LG Augsburg vorbereiten',
      description:  `LG Augsburg hat abgelehnt (21.05.2026) — fehlende deutsche Staatsbürgerschaft.
Usmonov erwartet Einbürgerung in ~2 Monaten (ca. Juli 2026).

NÄCHSTE SCHRITTE:
1. Usmonov kontaktieren: Wann genau ist die Einbürgerung? Welcher Stand?
2. Sobald Einbürgerung: Neuantrag LG Augsburg mit:
   - Nachweis deutsche Staatsangehörigkeit
   - Ausnahmeregelung seltene Sprachen (Usbekisch)
3. Kontakt: Ivonne Kern, ivonne.kern@lg-a.bayern.de, Tel: 0821/3105-1515
   (Di+Do 8-14:30, Mi Homeoffice)`,
      dueAt:        dueDate,
      priority:     'urgent',
      isAutomated:  false,
      createdById:  user.id,
    },
  })

  console.log('✅ Usmonov: certification_in_progress → contract_signed (LG Augsburg Absage)')
  console.log('✅ Urgenter Task erstellt: Einbürgerung abwarten + Neuantrag')
}

main().catch(console.error).finally(() => prisma.$disconnect())
