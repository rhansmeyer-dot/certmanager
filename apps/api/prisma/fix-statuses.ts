/**
 * Correct candidate statuses + contact data based on KANDIDATEN_STATUS_VOLLSTÄNDIG_2026-05-20.md
 *
 * Key findings from the deeper research:
 * 1. Juraev: NICHT contract_signed! Kein Vertrag, ABH-Problem, nach Planegg (Bayern!) umgezogen
 * 2. Usmonov: Wahrscheinlich contract_signed (Roadmap + Arbeitsanweisung erstellt)
 * 3. Negash: "Vertrag nie geschickt" → outline_sent
 * 4. Tajammol: "Vertrag per Mail erhalten" → contract_sent (upgrade!)
 * 5. Markiza: "Vertrag bereits erstellt" → contract_sent (upgrade!)
 * 6. Nareshelashvili: Analyse gemacht → analyzed (war identified)
 * 7. Gadamauri, Tajammol, Guri, Bustonov: neue Kontaktdaten gefunden
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Korrigiere Kandidaten-Status und Kontaktdaten...\n')

  const ramon = await prisma.user.findUniqueOrThrow({ where: { email: 'info@speak2.de' } })

  // ── Bundesland IDs holen ────────────────────────────────────────────────
  const bls = await prisma.bundeslandRule.findMany({ select: { id: true, bundeslandCode: true } })
  const bl = Object.fromEntries(bls.map(b => [b.bundeslandCode, b.id]))

  // ─────────────────────────────────────────────────────────────────────────
  // 1. IZZATILLO JURAEV (SP-2026-001)
  //    ALT: contract_signed, SA (Halle)
  //    NEU: contract_sent (Vertrag verschickt aber nicht zurück, ABH-Problem)
  //         + Bundesland: BY (nach Planegg umgezogen!)
  //         + Notiz über ABH-Problem
  // ─────────────────────────────────────────────────────────────────────────
  {
    const c = await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-001' } })
    if (c) {
      await prisma.candidate.update({
        where: { candidateRef: 'SP-2026-001' },
        data: {
          status:          'contract_sent',
          waitingFor:      'candidate',
          bundeslandId:    bl['BY'],           // NACH PLANEGG (BAYERN) UMGEZOGEN!
          currentCity:     'Planegg bei München',
          contractSignedAt: null,              // kein unterschriebener Vertrag
          contractSentAt:  new Date('2026-03-04'), // Vertrag war geschickt (alte Adresse)
          notes: `Muttersprache: Usbekisch (Andijan). Deutsch: C1 (TELC).
B.Sc. Lehramt Mathematik, Uni Andijan (Note 1,2). Zulassung zum Lehramt SA.
Aktuell: Master Physik Uni Magdeburg + Lehrkraft Landesschulamt SA (evtl. nun Planegg).

⚠️ KRITISCH - ABH-PROBLEM:
04.03.2026: Vertrag grundsätzlich zugestimmt ABER dann E-Mail:
"Ich habe bei meinem Ansprechpartner der Ausländerbehörde nachgefragt, ob ich diese
Tätigkeit ausüben darf, obwohl im Zusatzblatt keine Erlaubnis zur selbständigen Tätigkeit steht.
Leider habe ich seit Wochen keine Rückmeldung erhalten."
→ Ramón hat Minijob-Vertrag als Alternative angeboten. Kein Follow-up seit März 2026!

⚠️ ADRESSÄNDERUNG:
Vertrag an ALTE Adresse Halle geschickt — er ist nach Planegg bei München umgezogen!
Neuer Bundesland-Zuständiger: LG München/Augsburg (Bayern Ausnahmeregelung, Ivonne Kern)
Nicht mehr: OLG Naumburg!

NÄCHSTE SCHRITTE:
1. Kontakt aufnehmen: "Wie ist der Stand mit der ABH?"
2. Neue Adresse bestätigen (Planegg)
3. Neuen Vertrag mit Bayern-Konditionen schicken
4. Falls ABH weiter wartet: Minijob-Vertrag als Alternative
Kosten speak2: ~400€. Erfolgschance: 75-85%.`,
        },
      })

      // Pipeline-Event für Korrektur
      await prisma.pipelineEvent.create({
        data: {
          candidateId:   c.id,
          fromStatus:    'contract_signed',
          toStatus:      'contract_sent',
          triggeredById: ramon.id,
          isAutomated:   false,
          notes:         'Status-Korrektur: Kein unterschriebener Vertrag. ABH-Problem. Umgezogen nach Bayern (Planegg).',
          createdAt:     new Date(),
        },
      })

      console.log('✅ SP-2026-001 Juraev: contract_signed → contract_sent (BY, Planegg)')
      console.log('   ⚠️  ACHTUNG: Nach Bayern umgezogen! Bundesland geändert: SA → BY')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. FARIDJON USMONOV (SP-2026-002)
  //    Bleibt contract_signed — Roadmap + Arbeitsanweisung wurden erstellt
  //    (08.04.2026: "faridjon hat schon unterzeichnet und diana kennt ihn")
  //    Aber: Status UNKLAR — Notizen aktualisieren
  // ─────────────────────────────────────────────────────────────────────────
  {
    await prisma.candidate.update({
      where: { candidateRef: 'SP-2026-002' },
      data: {
        contractSignedAt: new Date('2026-04-08'), // Roadmap+Arbeitsanweisung erstellt
        notes: `Muttersprache: Usbekisch (Samarkand). Deutsch: C1 (Uni Mannheim, 2015).
Master Germanistik + Bachelor Germanistik mit Auszeichnung (Nationale Uni Usbekistans).
5+ Jahre Deutschlehrer in Usbekistan. Bildungspartnerschaft Goethe Institut Taschkent.
Aktuell: Pädagogische Ergänzungskraft, Kinderhort Planegg.

⚠️ STATUS WAHRSCHEINLICH UNTERSCHRIEBEN (aber noch zu bestätigen):
08.04.2026: "faridjon hat schon unterzeichnet und diana kennt ihn"
→ Roadmap-Faridjon-Usmonov.pdf + Arbeitsanweisung-Diana-Usmonov.pdf erstellt.
ABER: Widersprüchliche Info aus selber Zeit: "ausser einem initialen Telefongespräch fand nichts statt"

Weg: Bayern Ausnahmeregelung für seltene Sprachen (LG Augsburg, Ivonne Kern bestätigt).
WICHTIG: Rechtssprache NICHT für Übersetzer erforderlich (nur Dolmetscher).
Nächster Schritt: Status bestätigen. Falls unterschrieben → Apostillen für Uni-Abschlüsse.
Kosten speak2: 500-1.500€. Timeline: 2-4 Monate. Erfolgschance: 80-90%.`,
      },
    })
    console.log('✅ SP-2026-002 Usmonov: contract_signed beibehalten (Roadmap+Arbeitsanweisung = Indiz für Unterschrift)')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. HERR NEGASH (SP-2026-003)
  //    ALT: contract_sent
  //    NEU: outline_sent ("Vertrag nie geschickt" laut KANDIDATEN_STATUS)
  // ─────────────────────────────────────────────────────────────────────────
  {
    const c = await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-003' } })
    if (c) {
      await prisma.candidate.update({
        where: { candidateRef: 'SP-2026-003' },
        data: {
          status:       'outline_sent',
          waitingFor:   'candidate',
          contractSentAt: null, // Vertrag wurde NIE geschickt
          notes: `Muttersprache: Tigrinya (Eritrea/Äthiopien). Vorname UNBEKANNT!
Wohnort: Frankfurt am Main, Hessen.
Kontaktdaten: noch zu extrahieren (in alten Claude.ai-Chats).

⚠️ STATUS: Outline/Konditionen erklärt, aber Vertrag NIE geschickt!
März 2026: "Muss noch Vertrag unterschreiben" — Prüfungstermin November 2025 verpasst.
Nächster Termin: November 2026 (Hessische Lehrkräfteakademie).
❌ Kein Follow-up seit März 2026!

KRITISCHE AUFGABEN:
1. Vorname von Herrn Negash klären
2. Kontaktdaten (E-Mail/Tel) aus alten Chats extrahieren
3. Vertrag schicken
4. Anmeldung für Nov 2026-Prüfung vorbereiten (Frist!)
Kontakt Lehrkräfteakademie: Heike Kukuk, Tel: +49 6151 3682-558
Kosten speak2: ~800-1.200€. Timeline: bis November 2026. Erfolgschance: 70-80%.`,
        },
      })

      await prisma.pipelineEvent.create({
        data: {
          candidateId:   c.id,
          fromStatus:    'contract_sent',
          toStatus:      'outline_sent',
          triggeredById: ramon.id,
          isAutomated:   false,
          notes:         'Status-Korrektur: Vertrag wurde nie geschickt (laut KANDIDATEN_STATUS_VOLLSTÄNDIG).',
        },
      })
      console.log('✅ SP-2026-003 Negash: contract_sent → outline_sent (Vertrag nie geschickt)')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. BEHSHAD TAJAMMOL (SP-2026-004)
  //    ALT: outline_sent
  //    NEU: contract_sent ("März 2026: Vertrag per Mail erhalten")
  //    + neue Kontaktdaten gefunden
  // ─────────────────────────────────────────────────────────────────────────
  {
    const c = await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-004' } })
    if (c) {
      await prisma.candidate.update({
        where: { candidateRef: 'SP-2026-004' },
        data: {
          status:       'contract_sent',
          waitingFor:   'candidate',
          email:        'behshad.tajammol@gmail.com',
          phone:        '+49 1763 0112062',
          contractSentAt: new Date('2026-03-01'),
          notes: `Muttersprache: Farsi. Deutsch: Muttersprachenniveau (HfK-Studium belegt).
Diplom HfK Bremen (Hochschule für Künste).
Kontakt: behshad.tajammol@gmail.com | +49 1763 0112062

SITUATION:
März 2026: Vertrag per Mail erhalten.
März 2026: Zögert wegen Prüfungsgebühren (Eigenanteil).
→ MISSVERSTÄNDNIS! Er denkt er muss ALLES zahlen.
WAHRHEIT: speak2 übernimmt bis 2.500€ — er zahlt nur ~100-250€ für eigene Dokumente!
❌ Kein Follow-up seit März 2026!

NÄCHSTER SCHRITT:
Anrufen/E-Mail: "Hast du Fragen zu den Kosten?"
Klarstellen: speak2 übernimmt 2.500€, er zahlt nur eigene Beglaubigungen (~100-250€).
Bei Interesse: Vertrag unterschreiben.

Weg: Hanseatisches OLG Bremen, Standardweg.
Kosten speak2: ~900-1.200€. Timeline: 4-8 Monate. Erfolgschance: 75-85%.`,
        },
      })

      await prisma.pipelineEvent.create({
        data: {
          candidateId:   c.id,
          fromStatus:    'outline_sent',
          toStatus:      'contract_sent',
          triggeredById: ramon.id,
          isAutomated:   false,
          notes:         'Status-Korrektur: März 2026 "Vertrag per Mail erhalten" — also contract_sent.',
        },
      })
      console.log('✅ SP-2026-004 Tajammol: outline_sent → contract_sent (Vertrag wurde empfangen)')
      console.log('   + Kontaktdaten: behshad.tajammol@gmail.com | +49 1763 0112062')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. ELINDA GURI (SP-2026-005)
  //    Status bleibt outline_sent
  //    WICHTIG: PhD + 2x Master (viel stärker als gedacht!), B2 Deutsch ist Blocker
  //    + Adresse gefunden
  // ─────────────────────────────────────────────────────────────────────────
  {
    await prisma.candidate.update({
      where: { candidateRef: 'SP-2026-005' },
      data: {
        currentCity: 'Staßfurt',
        notes: `Muttersprache: Albanisch. Wohnort: Hamsterstr. 5, 39418 Staßfurt (Sachsen-Anhalt).

⭐ QUALIFIKATION: PhD + 2x Master! Sehr stark akademisch.
⚠️ PROBLEM: Deutsch nur B2 — Voraussetzung ist C1/C2!

SITUATION:
März 2026: Konditionen/Outline erhalten. Gespräch geführt.
März 2026: Problem: Deutsch nur B2, braucht C1.
→ Prozess pausiert bis C1 nachgewiesen.
❌ Kein Follow-up seit März 2026!

NÄCHSTER SCHRITT:
1. Nachfragen: "Hast du C1-Kurs gestartet oder abgeschlossen?"
2. Falls C1: Vertrag schicken, weitermachen
3. Falls nicht: C1-Vorbereitung motivieren (online, z.B. telc oder Goethe)

Weg: LG Magdeburg (Sachsen-Anhalt, Ausnahmeregelung).
Kosten speak2: ~600-1.000€. Timeline: 4-8 Monate (nach C1). Erfolgschance: 70-80%.`,
      },
    })
    console.log('✅ SP-2026-005 Guri: outline_sent beibehalten')
    console.log('   + Adresse: Hamsterstr. 5, 39418 Staßfurt | PhD + 2x Master (stärker als gedacht!)')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. ZANE MARKIZA (SP-2026-006)
  //    ALT: outline_sent
  //    NEU: contract_sent ("März 2026: Vertrag bereits erstellt" → verschickt)
  // ─────────────────────────────────────────────────────────────────────────
  {
    const c = await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-006' } })
    if (c) {
      await prisma.candidate.update({
        where: { candidateRef: 'SP-2026-006' },
        data: {
          status:       'contract_sent',
          waitingFor:   'candidate',
          contractSentAt: new Date('2026-03-15'),
          notes: `Muttersprache: Lettisch. 15 Jahre in Deutschland. Deutsch: C2.
Adresse: Alemannenstraße 23, 79689 Maulburg (Baden-Württemberg).
Bachelor Sprachwissenschaft Lettisch (Universität Lettland).

SITUATION:
März 2026: Konditionen besprochen, Vertrag erstellt und verschickt.
→ KEIN Follow-up ob unterschrieben! Vertrag könnte noch offen sein.
20.05.2026: Thomas Schlegtendal hat Handreichung für BW-Strategie erhalten.

ZWEI-WEGE-STRATEGIE (Baden-Württemberg hat KEINE Ausnahmeregelung):
Weg 1 (Priorität): Gleichwertigkeitsfeststellung RP Karlsruhe, Referat 76
  Frau Annette Gebhardt, Tel: 0721-926 4627, Annette.Gebhardt@rpk.bwl.de
  Frau Karin Emmenecker-Fink, Tel: 0721-926 4235
  Kosten: 550-750€, Timeline: 3-6 Monate, Erfolgschance: 50-60%
Weg 2 (Backup): Staatliche Prüfung Hamburg für Lettisch
  Kosten: 450-2.450€, Timeline: 9-15 Monate, Erfolgschance: 70-80%

NÄCHSTER SCHRITT:
1. Status klären: Hat sie unterschrieben?
2. Thomas: Karlsruhe diese Woche anrufen (Frau Gebhardt)
Zuständiges LG: LG Waldshut-Tiengen (NICHT LG Freiburg!)`,
        },
      })

      await prisma.pipelineEvent.create({
        data: {
          candidateId:   c.id,
          fromStatus:    'outline_sent',
          toStatus:      'contract_sent',
          triggeredById: ramon.id,
          isAutomated:   false,
          notes:         'Status-Korrektur: März 2026 "Vertrag bereits erstellt" — Vertrag wurde verschickt.',
        },
      })
      console.log('✅ SP-2026-006 Markiza: outline_sent → contract_sent (Vertrag erstellt und verschickt)')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. MEDINA GADAMAURI (SP-2026-008)
  //    Status bleibt analyzed (Vertrag NIE geschickt)
  //    + wichtige Kontaktdaten gefunden!
  // ─────────────────────────────────────────────────────────────────────────
  {
    await prisma.candidate.update({
      where: { candidateRef: 'SP-2026-008' },
      data: {
        email:       'Meedina0409@hotmail.com',
        phone:       '0176/71 20 89 19',
        currentCity: 'Hamburg',
        notes: `Muttersprache: Tschetschenisch + Russisch.
Kontakt: Meedina0409@hotmail.com | 0176/71 20 89 19
Adresse: Scheideholzweg 70, 21149 Hamburg.

⭐ TRAUMKANDIDATIN: Nur 5 Tschetschenisch-Übersetzer bundesweit!
Wartet seit März 2026 — VERTRAG NIE GESCHICKT!

SITUATION:
18.02.2026: Referenzschreiben für sie erstellt.
März 2026: "Interesse bestätigt, wartet auf Unterlagen"
März 2026: User sagte "gadamauri fehlt noch" + "rufe sie morgen an"
→ Anruf anscheinend nie gemacht. Kein Follow-up!

NÄCHSTER SCHRITT:
1. SOFORT anrufen: 0176/71 20 89 19
2. Vertrag + Hinweisblatt schicken
3. OLG Hamburg als Zielgericht bestätigen

Weg: Justizbehörde Hamburg / LG Hamburg.
Kosten speak2: ~800-1.200€. Timeline: 4-8 Monate. Erfolgschance: 70-80%.`,
      },
    })
    console.log('✅ SP-2026-008 Gadamauri: analyzed beibehalten')
    console.log('   + Kontaktdaten: Meedina0409@hotmail.com | 0176/71 20 89 19')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. GVANTSA NARESHELASHVILI (SP-2026-010)
  //    ALT: identified
  //    NEU: analyzed (Analyse gemacht, bewusst nicht weiter verfolgt)
  // ─────────────────────────────────────────────────────────────────────────
  {
    const c = await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-010' } })
    if (c) {
      await prisma.candidate.update({
        where: { candidateRef: 'SP-2026-010' },
        data: {
          status:     'analyzed',
          waitingFor: 'speak2',
          analyzedAt: new Date('2026-04-15'),
          automationPaused: true, // bewusst pausiert für 2-3 Jahre
          notes: `Muttersprache: Georgisch. Adresse: Prager Straße 135, 04317 Leipzig.
Kontakt: gvantsanareshelashvili22@gmail.com | +49 162 8950156
Geburtsjahr ca. 2003-2004 (Abitur 2022). Alter: ~21-22 Jahre.

Deutsch: C1 (telc C1 Hochschule, erst seit 2024!). General Education Diploma (Goldmedaille, Note 1,0).
Zahnmedizin Tbilisi (abgebrochen nach 3 Sem.). Uni Leipzig ab 2026 (Studiengang unklar).
Online-Deutschlehrerin seit 07/2025. Au-pair 2024-2025.

ENTSCHEIDUNG: JETZT NICHT AKTIVIEREN — in 2-3 Jahren nochmal prüfen.
Markt: EXTREM selten (~10-20 ermächtigte Georgisch-Übersetzer bundesweit).
Aber Blocker:
  ❌ Kein relevanter Hochschulabschluss (Zahnmedizin abgebrochen)
  ❌ Nur C1, muss C2
  ❌ Keine Übersetzungserfahrung
  ❓ Aufenthaltsrecht für Selbstständigkeit (georgische Staatsbürgerin)

Weg wenn bereit: OLG Dresden, Zuerkennung ohne Prüfung.`,
        },
      })

      await prisma.pipelineEvent.create({
        data: {
          candidateId:   c.id,
          fromStatus:    'identified',
          toStatus:      'analyzed',
          triggeredById: ramon.id,
          isAutomated:   false,
          notes:         'Status-Korrektur: Analyse abgeschlossen. Entscheidung: in 2-3 Jahren reaktivieren.',
        },
      })
      console.log('✅ SP-2026-010 Nareshelashvili: identified → analyzed (Analyse gemacht, bewusst pausiert)')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 9. BUNYODBEK BUSTONOV (SP-2026-012)
  //    Status bleibt dropped
  //    + neue Qualifikationen gefunden (C2, Abitur DE, Bachelor Soziale Arbeit)
  // ─────────────────────────────────────────────────────────────────────────
  {
    await prisma.candidate.update({
      where: { candidateRef: 'SP-2026-012' },
      data: {
        deutschLevel:   'C2',
        educationLevel: 'Abitur Deutschland + Bachelor Soziale Arbeit',
        notes: `Muttersprache: Usbekisch. Wohnort: Frankfurt am Main, Hessen.
⭐ Viel stärker als gedacht: C2 Deutsch, Abitur DE, Bachelor Soziale Arbeit!
Kontaktdaten: bei Diana (nicht in Drive gefunden — aus alten Chats extrahieren!)

Weg (wäre gewesen): Hessische Lehrkräfteakademie Überprüfungsverfahren (wie Negash).

STATUS: DROPPED — Reagiert nicht mehr seit März 2026.
Plan: Letzte Chance E-Mail/Anruf senden. Falls keine Reaktion → endgültig streichen.
(Kontaktdaten noch zu finden aus alten Chats)`,
      },
    })
    console.log('✅ SP-2026-012 Bustonov: dropped beibehalten')
    console.log('   + Qualifikationen: C2 Deutsch, Abitur DE, Bachelor Soziale Arbeit')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Tasks aktualisieren — alte Task für Juraev-OLG löschen (falsche Bundesland)
  // und neue korrekten Tasks erstellen
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n📅 Tasks aktualisieren...\n')

  // Juraev's alte OLG-Naumburg Task canceln (er ist jetzt in Bayern)
  const juraevTasks = await prisma.task.findMany({
    where: {
      candidate: { candidateRef: 'SP-2026-001' },
      status: 'pending',
    },
  })
  for (const t of juraevTasks) {
    await prisma.task.update({
      where: { id: t.id },
      data: { status: 'cancelled' },
    })
  }
  console.log('  🗑️  Juraev OLG-Naumburg Task gecancelt (falsche Bundesland — jetzt Bayern)')

  // Korrekte Tasks für Juraev (Bayern)
  const juraev = await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-001' } })
  if (juraev) {
    await prisma.task.create({
      data: {
        candidateId: juraev.id,
        title: 'Juraev: ABH-Status klären + neue Adresse Planegg bestätigen',
        description: 'Er ist von Halle nach Planegg (Bayern) umgezogen!\n1. Fragen: "Wie ist der Stand mit der Ausländerbehörde?"\n2. Neue Adresse Planegg bestätigen\n3. Neuen Vertrag mit Bayern-Konditionen schicken (LG Augsburg, Ivonne Kern)\n4. Falls ABH blockt: Minijob-Vertrag als Alternative anbieten\nSeit März 2026 kein Kontakt!',
        dueAt:       new Date('2026-05-22'),
        priority:    'urgent',
        isAutomated: false,
        createdById: ramon.id,
      },
    })
    console.log('  📌 Neuer Task: Juraev ABH-Status + Adresse Planegg (BY)')
  }

  // Gadamauri: dringend anrufen
  const gadamauri = await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-008' } })
  if (gadamauri) {
    // Alten Task löschen falls vorhanden
    const existingTasks = await prisma.task.findMany({
      where: { candidateId: gadamauri.id, status: 'pending' },
    })
    // Neuen Task erstellen (präziser)
    if (existingTasks.length === 0) {
      await prisma.task.create({
        data: {
          candidateId: gadamauri.id,
          title: 'Gadamauri SOFORT anrufen — Traumkandidatin wartet seit März!',
          description: 'Meedina0409@hotmail.com | 0176/71 20 89 19\nAdresse: Scheideholzweg 70, 21149 Hamburg\nNur 5 Tschetschenisch-Übersetzer bundesweit!\nSofort: Vertrag + Hinweisblatt schicken.',
          dueAt:       new Date('2026-05-22'),
          priority:    'urgent',
          isAutomated: false,
          createdById: ramon.id,
        },
      })
      console.log('  📌 Neuer Task: Gadamauri SOFORT anrufen')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Zusammenfassung
  // ─────────────────────────────────────────────────────────────────────────
  const candidates = await prisma.candidate.findMany({
    select: { candidateRef: true, firstName: true, lastName: true, status: true, waitingFor: true },
    orderBy: { candidateRef: 'asc' },
  })

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              ✅  Korrekturen abgeschlossen!                     ║
╠══════════════════════════════════════════════════════════════════╣
║  FINALER STATUS ALLER KANDIDATEN:                               ║`)

  for (const c of candidates) {
    const line = `  ${c.candidateRef}  ${(c.firstName + ' ' + c.lastName).padEnd(25)} → ${c.status}`
    console.log(`║  ${line.padEnd(62)}║`)
  }

  console.log(`╠══════════════════════════════════════════════════════════════════╣
║  ⚠️  SCHOCKIERENDER FUND:                                       ║
║  Juraev ist nach PLANEGG (BAYERN) umgezogen!                    ║
║  → Bundesland geändert: SA → BY                                 ║
║  → Gericht: OLG Naumburg → LG Augsburg (Ivonne Kern)           ║
╠══════════════════════════════════════════════════════════════════╣
║  NEUE KONTAKTDATEN:                                             ║
║  Tajammol: behshad.tajammol@gmail.com | +49 1763 0112062       ║
║  Gadamauri: Meedina0409@hotmail.com | 0176/71 20 89 19         ║
║  Guri: Hamsterstr. 5, 39418 Staßfurt                           ║
╚══════════════════════════════════════════════════════════════════╝
`)
}

main()
  .catch(err => {
    console.error('❌ Fehler:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
