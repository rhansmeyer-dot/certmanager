import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const ramon = await prisma.user.findUniqueOrThrow({ where: { email: 'info@speak2.de' } })
  const thomas = await prisma.user.findFirst({ where: { email: 'thomas@speak2.de' } })

  // NRW gibt es noch nicht in der DB — NI nehmen als Platzhalter, manuell ändern
  // Solingen → NRW → LG Wuppertal oder LG Düsseldorf
  const count = await prisma.candidate.count()

  const candidate = await prisma.candidate.create({
    data: {
      candidateRef:    `SP-2026-${String(count + 1).padStart(3, '0')}`,
      firstName:       'Anhelina',
      lastName:        'Marushka',
      email:           'marushka2002@gmail.com',
      phone:           '0151 57938364',
      nativeLanguage:  'Ukrainisch',
      languagePair:    'Ukrainisch + Russisch ↔ Deutsch',
      countryOfOrigin: 'Ukraine',
      currentCity:     'Solingen',
      fullAddress:     'Eipaßsrtaße 70, 42719 Solingen',
      deutschLevel:    'C1',
      educationLevel:  'Bachelor of Law, Nationale Juristische Universität „Jaroslav Mudryj" Charkiv (2019-2023)',
      dateOfBirth:     new Date('2002-05-02'),
      hasTranslationExp: false,
      source:          'CV eingesandt',
      status:          'identified',
      waitingFor:      'speak2',
      identifiedAt:    new Date(),
      notes: `Ukrainisch (Muttersprache) + Russisch (verhandlungssicher) + Deutsch C1
Bachelor of Law, Nationale Juristische Universität Charkiv → IDEAL für Rechtsübersetzungen!
Aktuell: Barista, Casanonna Düsseldorf
Wohnort: Solingen (NRW)

MARKTLAGE: Ukrainisch ist seit 2022 EXTREM gefragt — Millionen Flüchtlinge in DE, wenige zertifizierte Übersetzer.

POTENZIAL: Sehr hoch — Jura-Abschluss + Ukrainisch L1 + C1 Deutsch ist perfekte Kombination.

KRITISCHE FRAGE: Aufenthaltsstatus?
  → Schutz Ukraine (§24 AufenthG) → Selbstständigkeit erlaubt? ← KLÄREN!
  → Falls ja: NRW, LG Wuppertal/Düsseldorf

NÄCHSTER SCHRITT: Thomas anrufen lassen — Status, Interesse, Aufenthalt klären.`,
    },
  })

  await prisma.pipelineEvent.create({
    data: {
      candidateId:   candidate.id,
      fromStatus:    null,
      toStatus:      'identified',
      triggeredById: ramon.id,
      isAutomated:   false,
      notes:         'CV eingegangen (02.06.2026). Ukrainisch + Russisch, Bachelor of Law.',
    },
  })

  // Thomas-Anruf-Task
  await prisma.task.create({
    data: {
      candidateId:  candidate.id,
      assignedToId: thomas?.id ?? ramon.id,
      title:        `📞 [THOMAS] Anrufen: Anhelina Marushka — Ukrainisch/Russisch NRW`,
      description:  `Neue Kandidatin: Anhelina Marushka
Tel: 0151 57938364 | marushka2002@gmail.com
Solingen (NRW) | Bachelor of Law Charkiv | Deutsch C1

WICHTIGE FRAGEN:
1. Aufenthaltsstatus: Welches Visum/Aufenthaltserlaubnis? (§24 Schutz Ukraine?)
   → Ist Selbstständigkeit erlaubt?
2. Interesse an Übersetzer-Ermächtigung?
3. Übersetzungserfahrung vorhanden?
4. Bereit für 4-Jahres-Kooperationsvertrag?

KONTEXT: speak2 übernimmt Ermächtigungskosten (~700-1.000€) gegen 4-Jahre-Vertrag.
Ukrainisch ist seit 2022 extrem gefragt — gute Verdienstmöglichkeiten.

Ergebnis direkt in App eintragen!`,
      dueAt:       new Date(Date.now() + 24 * 60 * 60 * 1000),
      priority:    'high',
      isAutomated: false,
      createdById: ramon.id,
    },
  })

  console.log(`✅ ${candidate.candidateRef} Anhelina Marushka angelegt`)
  console.log(`📞 Thomas-Task erstellt`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
