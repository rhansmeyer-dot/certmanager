import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const ramon = await prisma.user.findUniqueOrThrow({ where: { email: 'info@speak2.de' } })
  const sa = await prisma.bundeslandRule.findUnique({ where: { bundeslandCode: 'SA' } })

  // ── 1. Juraev updaten — Privatinsolvenz, Status auf analyzed zurück ──────
  const juraev = await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-001' } })
  if (juraev) {
    await prisma.candidate.update({
      where: { candidateRef: 'SP-2026-001' },
      data: {
        status:    'analyzed',      // zurück — Vertrag kann er nicht unterschreiben
        waitingFor: 'candidate',
        dropReason: null,
        notes: (juraev.notes || '') + `

[31.05.2026 — Telefonanruf Juraev]:
Izzatillo Juraev hat angerufen. Erklärt sein Zögern: PRIVATINSOLVENZ.
Er kann selbst keinen neuen Geschäftsvertrag abschließen (Insolvenzverwalter-Problem).
VORSCHLAG: Seine FRAU übernimmt den Prozess stattdessen.
→ Frau Juraev wird neue Hauptkandidatin (SP-2026-001B)
→ Izzatillo bleibt als Kontaktperson/Referenz

Nächste Schritte:
1. Frau Juraev kontaktieren, Qualifikationen prüfen
2. Kooperationsvertrag mit IHR abschließen
3. Ermächtigungsantrag OLG Naumburg auf ihren Namen`,
      },
    })

    await prisma.pipelineEvent.create({
      data: {
        candidateId:   juraev.id,
        fromStatus:    'contract_sent',
        toStatus:      'analyzed',
        triggeredById: ramon.id,
        isAutomated:   false,
        notes:         'Telefonanruf 31.05.2026: Privatinsolvenz — kann keinen Vertrag unterschreiben. Frau übernimmt.',
      },
    })
    console.log('✅ Juraev: contract_sent → analyzed (Privatinsolvenz)')
  }

  // ── 2. Frau Juraev als neue Kandidatin anlegen ───────────────────────────
  const count = await prisma.candidate.count()
  const frauJuraev = await prisma.candidate.create({
    data: {
      candidateRef: `SP-2026-${String(count + 1).padStart(3, '0')}`,
      firstName:    'Frau',
      lastName:     'Juraev',
      nativeLanguage: 'Usbekisch',
      languagePair:   'Usbekisch ↔ Deutsch',
      countryOfOrigin: 'Usbekistan',
      currentCity:     'Halle (Saale)',
      bundeslandId:    sa?.id,
      targetCourt:     'OLG Naumburg',
      status:          'identified',
      waitingFor:      'speak2',
      source:          'Empfehlung Izzatillo Juraev (Privatinsolvenz)',
      notes: `Frau von Izzatillo Juraev (SP-2026-001).
Izzatillo Juraev hat Privatinsolvenz — kann keinen Geschäftsvertrag abschließen.
Er schlägt vor, dass seine Frau die Ermächtigung als Usbekisch-Übersetzerin anstrebt.

KONTAKT: Über Izzatillo Juraev (juraev.izzatillo@mail.de | +49 176 70405977)
ADRESSE (vermutlich): Streiberstrasse 33, 06110 Halle

QUALIFIKATIONEN: Noch unbekannt — müssen erfragt werden:
  • Deutschniveau?
  • Ausbildung/Abschluss?
  • Berufserfahrung?
  • Aufenthaltsstatus?

NÄCHSTE SCHRITTE:
1. Telefonat mit Frau Juraev (über Izzatillo organisieren)
2. CV/Qualifikationsnachweise anfordern
3. Wenn geeignet: Kooperationsvertrag mit Frau Juraev abschließen
4. Ermächtigungsantrag OLG Naumburg auf ihren Namen (§142 Abs. 3 ZPO)

Weg: OLG Naumburg, Sachsen-Anhalt, Ausnahmeregelung für seltene Sprachen.
Korrekte E-Mail: olg@justiz.sachsen-anhalt.de
Kosten speak2: ~400€. Timeline: 3-6 Monate.`,
      identifiedAt: new Date(),
    },
  })

  await prisma.pipelineEvent.create({
    data: {
      candidateId:   frauJuraev.id,
      fromStatus:    null,
      toStatus:      'identified',
      triggeredById: ramon.id,
      isAutomated:   false,
      notes:         'Neue Kandidatin — Ehefrau von Izzatillo Juraev (Privatinsolvenz). Anruf 31.05.2026.',
    },
  })

  // Task für Ramon
  await prisma.task.create({
    data: {
      candidateId:  frauJuraev.id,
      assignedToId: ramon.id,
      title:        '📞 Frau Juraev kennenlernen — Qualifikationen prüfen',
      description:  `Izzatillo Juraev (Privatinsolvenz) empfiehlt seine Frau als Kandidatin.
Über ihn Termin mit Frau Juraev organisieren.
Fragen:
  • Vorname?
  • Deutschniveau (C1 nötig für OLG Naumburg)?
  • Ausbildung/Abschluss?
  • Aufenthaltsstatus (dt. Pass oder Aufenthaltstitel)?
  • Bereit für 4-Jahres-Kooperationsvertrag?
Kontakt über: juraev.izzatillo@mail.de | +49 176 70405977`,
      dueAt:       new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      priority:    'urgent',
      isAutomated: false,
      createdById: ramon.id,
    },
  })

  console.log(`✅ Frau Juraev: ${frauJuraev.candidateRef} angelegt`)
  console.log(`   Portal-Token wird separat generiert`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
