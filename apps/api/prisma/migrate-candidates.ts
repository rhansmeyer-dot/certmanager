/**
 * Migrate existing 12 candidates from MASTER_STATUS.md into the database.
 * Run with: npx tsx prisma/migrate-candidates.ts
 */

import { PrismaClient, CandidateStatus, WaitingFor } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Migrating 12 candidates from MASTER_STATUS.md...\n')

  // ── Look up users and bundesland IDs ─────────────────────────────────────
  const ramon = await prisma.user.findUniqueOrThrow({ where: { email: 'info@speak2.de' } })

  const bundeslaender = await prisma.bundeslandRule.findMany({
    select: { id: true, bundeslandCode: true },
  })
  const bl = Object.fromEntries(bundeslaender.map(b => [b.bundeslandCode, b.id]))

  // ── Helper: create candidate + initial pipeline events ───────────────────
  async function createCandidate(data: {
    ref: string
    firstName: string
    lastName: string
    email?: string
    phone?: string
    nativeLanguage: string
    languagePair: string
    countryOfOrigin?: string
    currentCity?: string
    bundeslandCode?: string
    targetCourt?: string
    deutschLevel?: string
    educationLevel?: string
    hasTranslationExp?: boolean
    status: CandidateStatus
    waitingFor: WaitingFor
    notes?: string
    dropReason?: string
    identifiedAt?: Date
    analyzedAt?: Date
    outlineSentAt?: Date
    contractSentAt?: Date
    contractSignedAt?: Date
    droppedAt?: Date
    successChanceNote?: string // stored in notes
  }) {
    const candidate = await prisma.candidate.create({
      data: {
        candidateRef:    data.ref,
        firstName:       data.firstName,
        lastName:        data.lastName,
        email:           data.email ?? null,
        phone:           data.phone ?? null,
        nativeLanguage:  data.nativeLanguage,
        languagePair:    data.languagePair,
        countryOfOrigin: data.countryOfOrigin ?? null,
        currentCity:     data.currentCity ?? null,
        bundeslandId:    data.bundeslandCode ? bl[data.bundeslandCode] : null,
        targetCourt:     data.targetCourt ?? null,
        deutschLevel:    data.deutschLevel ?? null,
        educationLevel:  data.educationLevel ?? null,
        hasTranslationExp: data.hasTranslationExp ?? false,
        status:          data.status,
        waitingFor:      data.waitingFor,
        notes:           data.notes ?? null,
        dropReason:      data.dropReason ?? null,
        identifiedAt:    data.identifiedAt ?? new Date('2026-01-01'),
        analyzedAt:      data.analyzedAt ?? null,
        outlineSentAt:   data.outlineSentAt ?? null,
        contractSentAt:  data.contractSentAt ?? null,
        contractSignedAt: data.contractSignedAt ?? null,
        droppedAt:       data.droppedAt ?? null,
        createdAt:       data.identifiedAt ?? new Date('2026-01-01'),
      },
    })

    // Create pipeline event for the current status
    const statusTimestamps: Partial<Record<CandidateStatus, Date>> = {
      analyzed:         data.analyzedAt ?? undefined,
      outline_sent:     data.outlineSentAt ?? undefined,
      contract_sent:    data.contractSentAt ?? undefined,
      contract_signed:  data.contractSignedAt ?? undefined,
      dropped:          data.droppedAt ?? undefined,
    }

    await prisma.pipelineEvent.create({
      data: {
        candidateId:   candidate.id,
        fromStatus:    null,
        toStatus:      'identified',
        triggeredById: ramon.id,
        isAutomated:   false,
        notes:         'Kandidat aus MASTER_STATUS.md migriert',
        createdAt:     data.identifiedAt ?? new Date('2026-01-01'),
      },
    })

    if (data.status !== 'identified') {
      await prisma.pipelineEvent.create({
        data: {
          candidateId:   candidate.id,
          fromStatus:    'identified',
          toStatus:      data.status,
          triggeredById: ramon.id,
          isAutomated:   false,
          notes:         'Historischer Status aus MASTER_STATUS.md',
          createdAt:     statusTimestamps[data.status] ?? new Date(),
        },
      })
    }

    console.log(`  ✅ ${data.ref}  ${data.firstName} ${data.lastName} (${data.nativeLanguage}) → ${data.status}`)
    return candidate
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRIORITÄT A — Vertrag unterschrieben / aktiv
  // ═══════════════════════════════════════════════════════════════════════
  console.log('📋 Priorität A — Vertrag aktiv\n')

  // 1. Izzatillo Juraev — Usbekisch, Halle SA, VERTRAG UNTERSCHRIEBEN (März 2026)
  await createCandidate({
    ref:             'SP-2026-001',
    firstName:       'Izzatillo',
    lastName:        'Juraev',
    email:           'izzatillo.juraev@gmail.com',
    nativeLanguage:  'Usbekisch',
    languagePair:    'Usbekisch ↔ Deutsch',
    countryOfOrigin: 'Usbekistan',
    currentCity:     'Halle (Saale)',
    bundeslandCode:  'SA',
    targetCourt:     'OLG Naumburg',
    deutschLevel:    'C1',
    educationLevel:  'Bachelor (Lehramt Mathematik) + Master Physik (laufend)',
    status:          'contract_signed',
    waitingFor:      'speak2',
    identifiedAt:    new Date('2026-01-15'),
    analyzedAt:      new Date('2026-02-01'),
    outlineSentAt:   new Date('2026-02-10'),
    contractSentAt:  new Date('2026-02-20'),
    contractSignedAt: new Date('2026-03-04'),
    notes: `Muttersprache: Usbekisch (Andijan). Deutsch: C1 (TELC).
B.Sc. Lehramt Mathematik, Uni Andijan (Note 1,2). Abitur 2015 (Note 1,2).
Zulassung zum Lehramt in Sachsen-Anhalt. Aktuell: Master Physik Uni Magdeburg + Lehrkraft Landesschulamt SA. In DE seit: 2022.
Weg: OLG Naumburg direkt (§142 Abs. 3 ZPO). Korrekte E-Mail: olg@justiz.sachsen-anhalt.de (NICHT poststelle@...).
Nächster Schritt: Anfrage an OLG Naumburg senden, Unterlagen komplettieren, Portfolio aufbauen.
Kosten speak2: ~400€. Timeline: 3-6 Monate. Erfolgschance: 75-85%.`,
  })

  // 2. Faridjon Usmonov — Usbekisch, Planegg BY, VERTRAG GESCHICKT (Jan 2026)
  await createCandidate({
    ref:             'SP-2026-002',
    firstName:       'Faridjon',
    lastName:        'Usmonov',
    email:           'usmonov.faridjon2021@gmail.com',
    nativeLanguage:  'Usbekisch',
    languagePair:    'Usbekisch ↔ Deutsch',
    countryOfOrigin: 'Usbekistan',
    currentCity:     'Planegg bei München',
    bundeslandCode:  'BY',
    targetCourt:     'LG München / LG Augsburg',
    deutschLevel:    'C1',
    educationLevel:  'Master Germanistik (Nationale Universität Usbekistans)',
    hasTranslationExp: true,
    translationYears: 5,
    status:          'contract_sent',
    waitingFor:      'candidate',
    identifiedAt:    new Date('2026-01-05'),
    analyzedAt:      new Date('2026-01-10'),
    outlineSentAt:   new Date('2026-01-12'),
    contractSentAt:  new Date('2026-01-15'),
    notes: `Muttersprache: Usbekisch (Samarkand). Deutsch: C1 (Universität Mannheim, 2015).
Master Germanistik + Bachelor Germanistik (Auszeichnung) Nationale Universität Usbekistans.
5+ Jahre Deutschlehrer in Usbekistan (B1-C1). Bildungspartnerschaft Goethe Institut Taschkent.
Aktuell: Pädagogische Ergänzungskraft, Kinderhort Planegg.
Weg: Bayern Ausnahmeregelung für seltene Sprachen (LG Augsburg, Ivonne Kern bestätigt).
WICHTIG: Rechtssprache-Nachweis NICHT für Übersetzer erforderlich (nur Dolmetscher).
Nächster Schritt: Nachfassen ob Vertrag unterschrieben; Universitätsabschlüsse beglaubigen/apostillieren.
Kosten speak2: 500-1.500€. Timeline: 2-4 Monate. Erfolgschance: 80-90%.`,
  })

  // 3. Herr Negash — Tigrinya, Frankfurt HE, VERTRAG MUSS NOCH UNTERSCHRIEBEN WERDEN
  await createCandidate({
    ref:             'SP-2026-003',
    firstName:       '(Vorname unbekannt)',
    lastName:        'Negash',
    nativeLanguage:  'Tigrinya',
    languagePair:    'Tigrinya ↔ Deutsch',
    countryOfOrigin: 'Eritrea/Äthiopien',
    currentCity:     'Frankfurt am Main',
    bundeslandCode:  'HE',
    targetCourt:     'Hessische Lehrkräfteakademie',
    status:          'contract_sent',
    waitingFor:      'candidate',
    identifiedAt:    new Date('2026-01-20'),
    analyzedAt:      new Date('2026-02-01'),
    outlineSentAt:   new Date('2026-02-15'),
    contractSentAt:  new Date('2026-03-01'),
    notes: `Muttersprache: Tigrinya (Eritrea/Äthiopien). Kontaktdaten noch zu extrahieren.
Weg: Hessische Lehrkräfteakademie (Heike Kukuk, Tel: +49 6151 3682-558). Überprüfungsverfahren für seltene Sprachen.
Nächster Prüfungstermin: November 2026.
Nächster Schritt: Vertrag unterschreiben lassen, Rechtssprache-Kurs organisieren.
Kosten speak2: ~800-1.200€. Timeline: bis November 2026. Erfolgschance: 70-80%.`,
  })

  // ═══════════════════════════════════════════════════════════════════════
  // PRIORITÄT B — Outline bekommen, Nachfassen
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n📋 Priorität B — Outline gesendet\n')

  // 4. Behshad Tajammol — Farsi, Bremen HB
  await createCandidate({
    ref:             'SP-2026-004',
    firstName:       'Behshad',
    lastName:        'Tajammol',
    nativeLanguage:  'Farsi',
    languagePair:    'Farsi (Persisch) ↔ Deutsch',
    countryOfOrigin: 'Iran',
    currentCity:     'Bremen',
    bundeslandCode:  'HB',
    targetCourt:     'OLG Bremen',
    deutschLevel:    'C2',
    educationLevel:  'Diplom HfK Bremen (Hochschule für Künste)',
    hasTranslationExp: false,
    status:          'outline_sent',
    waitingFor:      'candidate',
    identifiedAt:    new Date('2026-01-15'),
    analyzedAt:      new Date('2026-01-20'),
    outlineSentAt:   new Date('2026-01-25'),
    notes: `Muttersprache: Farsi. Deutsch: Muttersprachenniveau (HfK-Studium belegt).
Diplom HfK Bremen (Hochschule für Künste).
Weg: OLG Bremen, Standardweg.
Problem: Zögert wegen Eigenkosten.
Lösung: Klarstellen dass speak2 Großteil übernimmt (bis 2.500€), er zahlt nur ~100-250€ für eigene Dokumente.
Nächster Schritt: Nochmal anrufen/anschreiben, Kostenstruktur klarstellen.
Kosten speak2: ~900-1.200€. Timeline: 4-8 Monate. Erfolgschance: 75-85%.`,
  })

  // 5. Elinda Guri — Albanisch, Staßfurt SA
  await createCandidate({
    ref:             'SP-2026-005',
    firstName:       'Elinda',
    lastName:        'Guri',
    nativeLanguage:  'Albanisch',
    languagePair:    'Albanisch ↔ Deutsch',
    countryOfOrigin: 'Albanien',
    currentCity:     'Staßfurt',
    bundeslandCode:  'SA',
    targetCourt:     'LG Magdeburg',
    status:          'outline_sent',
    waitingFor:      'candidate',
    identifiedAt:    new Date('2026-02-01'),
    analyzedAt:      new Date('2026-02-10'),
    outlineSentAt:   new Date('2026-02-15'),
    notes: `Muttersprache: Albanisch. CV vorhanden.
Weg: LG Magdeburg (Sachsen-Anhalt).
Nächster Schritt: Nochmal kontaktieren, Vertrag schicken wenn Interesse bestätigt.
Kosten speak2: ~600-1.000€. Timeline: 4-8 Monate. Erfolgschance: 70-80%.`,
  })

  // 6. Zane Markiza — Lettisch, Maulburg BW
  await createCandidate({
    ref:             'SP-2026-006',
    firstName:       'Zane',
    lastName:        'Markiza',
    nativeLanguage:  'Lettisch',
    languagePair:    'Lettisch ↔ Deutsch',
    countryOfOrigin: 'Lettland',
    currentCity:     'Maulburg',
    bundeslandCode:  'BW',
    targetCourt:     'LG Waldshut-Tiengen (NICHT LG Freiburg!)',
    deutschLevel:    'C2',
    educationLevel:  'Bachelor Sprachwissenschaft Lettisch (Universität Lettland)',
    status:          'outline_sent',
    waitingFor:      'candidate',
    identifiedAt:    new Date('2026-02-10'),
    analyzedAt:      new Date('2026-02-20'),
    outlineSentAt:   new Date('2026-03-01'),
    notes: `Muttersprache: Lettisch. 15 Jahre in Deutschland. Deutsch: C2. Adresse: Alemannenstraße 23, 79689 Maulburg.
ZWEI-WEGE-STRATEGIE:
Weg 1 (Priorität): Gleichwertigkeitsfeststellung Karlsruhe (RP Karlsruhe, Referat 76).
  Kontakt: Frau Annette Gebhardt, Tel: 0721-926 4627, Annette.Gebhardt@rpk.bwl.de
  Kosten: 550-750€, Timeline: 3-6 Monate, Erfolgschance: 50-60%.
Weg 2 (Backup): Staatliche Prüfung Hamburg für Lettisch.
  Kosten: 450-2.450€, Timeline: 9-15 Monate, Erfolgschance: 70-80%.
Problem: Baden-Württemberg macht KEINEN Unterschied für seltene Sprachen (Frau Graf, LG Freiburg).
Update 20.05.2026: Thomas Schlegtendal hat Handreichung erhalten, kontaktiert Karlsruhe diese Woche.
Nächster Schritt: Thomas kontaktiert Frau Gebhardt; Unterlagen vorbereiten (Bachelor-Zeugnis, Transcript, Apostille).`,
  })

  // ═══════════════════════════════════════════════════════════════════════
  // PRIORITÄT C — Analyse abgeschlossen / Interesse bekundet
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n📋 Priorität C — Analyse abgeschlossen\n')

  // 7. Rakhmonjon Makhmudov — Usbekisch, Brandenburg BB
  await createCandidate({
    ref:             'SP-2026-007',
    firstName:       'Rakhmonjon',
    lastName:        'Makhmudov',
    nativeLanguage:  'Usbekisch',
    languagePair:    'Usbekisch ↔ Deutsch',
    countryOfOrigin: 'Usbekistan',
    currentCity:     'Brandenburg an der Havel',
    bundeslandCode:  'BB',
    targetCourt:     'LG Potsdam',
    deutschLevel:    'B2',
    educationLevel:  'Anerkannter Berufsabschluss Krankenpflege',
    status:          'analyzed',
    waitingFor:      'speak2',
    identifiedAt:    new Date('2026-02-01'),
    analyzedAt:      new Date('2026-02-15'),
    notes: `Muttersprache: Usbekisch (Fergana-Region). Deutsch: B2 (ZU NIEDRIG! Muss auf C1/C2).
Weitere Sprachen: Russisch, Türkisch. Anerkannter Berufsabschluss Krankenpflege. 2 Jahre Berufserfahrung DE.
Botschaftskontakte vorhanden. CV vorhanden.
MARKTLAGE: SENSATIONELL - KEIN ermächtigter Usbekisch-Übersetzer in Berlin/Brandenburg! Nächste: NRW, 500 km.
Weg: LG Potsdam, §3 Abs. 3 BbgSpMG (seltene Sprache). Strategie: Empfehlungsschreiben Usbekische Botschaft Berlin.
Timeline:
  1. C1-Prüfung (6-12 Monate)
  2. Rechtssprachkurs (~300-500€, 40 Std.)
  3. Portfolio: 15-20 Musterübersetzungen
  4. Usbekische Botschaft Berlin (Empfehlungsschreiben)
  5. Antrag LG Potsdam
Kosten speak2: ~800-1.500€. Timeline: 6-18 Monate. Erfolgschance: 75-85%.`,
  })

  // 8. Medina Gadamauri — Tschetschenisch+Russisch, Hamburg HH
  await createCandidate({
    ref:             'SP-2026-008',
    firstName:       'Medina',
    lastName:        'Gadamauri',
    nativeLanguage:  'Tschetschenisch',
    languagePair:    'Tschetschenisch + Russisch ↔ Deutsch',
    countryOfOrigin: 'Tschetschenien',
    currentCity:     'Hamburg',
    bundeslandCode:  'HH',
    targetCourt:     'LG Hamburg',
    status:          'analyzed',
    waitingFor:      'speak2',
    identifiedAt:    new Date('2026-02-15'),
    analyzedAt:      new Date('2026-03-01'),
    notes: `Muttersprache: Tschetschenisch + Russisch. Interesse bekundet.
Weg: LG Hamburg. Kontaktdaten noch zu extrahieren.
Nächster Schritt: Vertrag + Hinweisblatt schicken.
Kosten speak2: ~800-1.200€. Timeline: 4-8 Monate. Erfolgschance: 70-80%.`,
  })

  // 9. Padideh Taasoli — Farsi, Dresden SN
  await createCandidate({
    ref:             'SP-2026-009',
    firstName:       'Padideh',
    lastName:        'Taasoli',
    email:           'padi75taasoli@gmail.com',
    phone:           '017642767160',
    nativeLanguage:  'Farsi',
    languagePair:    'Farsi (Persisch) ↔ Deutsch',
    countryOfOrigin: 'Iran',
    currentCity:     'Dresden',
    bundeslandCode:  'SN',
    targetCourt:     'OLG Dresden',
    deutschLevel:    'C1',
    educationLevel:  'Bachelor Industrie-/Produktdesign (Azad-Universität Teheran) + Studienkolleg TU Dresden',
    status:          'analyzed',
    waitingFor:      'speak2',
    identifiedAt:    new Date('2026-04-01'),
    analyzedAt:      new Date('2026-05-10'),
    notes: `Muttersprache: Farsi. Staatsangehörigkeit: Iranisch. Geb.: 05.02.1997 (29 J).
Adresse: Pietzschstraße 1a, 01159 Dresden.
Deutsch: C1 (Studienkolleg TU Dresden, Abschluss Note 1,1).
Bachelor Industrie-/Produktdesign, Azad-Universität Teheran (2016-2020).
Studienkolleg Wirtschaft, TU Dresden (2024-2025, Note 1,1). Duales Studium Bürgschaftsbank Dresden (10/2025 - 2028).
Weg: OLG Dresden - Zuerkennung ohne Prüfung (Farsi hat keine staatliche Prüfung in Sachsen seit 3+ Jahren).
Markt: 200.000+ Iraner in Deutschland, hohe Nachfrage.
Anforderungen:
  ✅ Wohnsitz Sachsen (Dresden)
  ✅ Zuerkennung ohne Prüfung anwendbar
  ✅ Iranisches Abitur, ✅ Bachelor Teheran, ✅ Führungszeugnis
  ❌ Rechtssprache-Grundkenntnisse (noch zu machen, ~500€)
Risiko: OLG Dresden könnte argumentieren Farsi-Prüfung in anderen BL möglich (z.B. Hessen).
Nächster Schritt: Kontakt aufnehmen, ggf. mit Gvantsa Nareshelashvili zusammen ans OLG Dresden anfragen.
Kosten speak2: ~900€. Timeline: 3-6 Monate. Erfolgschance: 70-75%.`,
  })

  // 10. Gvantsa Nareshelashvili — Georgisch, Leipzig SN (Langfristig)
  await createCandidate({
    ref:             'SP-2026-010',
    firstName:       'Gvantsa',
    lastName:        'Nareshelashvili',
    email:           'gvantsanareshelashvili22@gmail.com',
    phone:           '+49 162 8950156',
    nativeLanguage:  'Georgisch',
    languagePair:    'Georgisch ↔ Deutsch',
    countryOfOrigin: 'Georgien',
    currentCity:     'Leipzig',
    bundeslandCode:  'SN',
    targetCourt:     'OLG Dresden',
    deutschLevel:    'C1',
    educationLevel:  'Zahnmedizin Tbilisi (abgebrochen) + Uni Leipzig ab 2026',
    status:          'identified',
    waitingFor:      'candidate',
    identifiedAt:    new Date('2026-04-15'),
    notes: `Muttersprache: Georgisch. Adresse: Prager Straße 135, 04317 Leipzig. Alter: ~21-22 Jahre.
Deutsch: C1 (telc C1 Hochschule, erst seit 2024!). General Education Diploma (Goldmedaille, Note 1,0).
Zahnmedizin Tbilisi (abgebrochen nach 3 Semestern). Uni Leipzig ab 2026 (Studiengang unklar).
Online-Deutschlehrerin (seit 07/2025). Au-pair (2024-2025).
Weg: OLG Dresden - Zuerkennung ohne Prüfung (Georgisch: definitiv keine staatliche Prüfung in DE).
Markt: EXTREM selten - geschätzt nur 10-20 ermächtigte Übersetzer bundesweit.
SCHWÄCHEN:
  ❌ Kein relevanter Hochschulabschluss (Zahnmedizin abgebrochen)
  ❌ Nur C1 (muss C2), ❌ Keine Übersetzungserfahrung
  ❓ Aufenthaltsstatus (georgische Staatsbürgerin - Selbstständigkeit evtl. aufenthaltsrechtlich problematisch!)
EMPFEHLUNG: JETZT NOCH NICHT als aktive Kandidatin aufnehmen. In 2-3 Jahren nochmal prüfen.
Timeline: Frühestens 2-3 Jahre (Studium + C2 + Rechtssprache + Portfolio + Aufenthaltsstatus).`,
  })

  // 11. Sinthujaya Piratheepan — Tamil, Hann. Münden NI
  await createCandidate({
    ref:             'SP-2026-011',
    firstName:       'Sinthujaya',
    lastName:        'Piratheepan',
    nativeLanguage:  'Tamil',
    languagePair:    'Tamil ↔ Deutsch',
    countryOfOrigin: 'Sri Lanka',
    currentCity:     'Hann. Münden',
    bundeslandCode:  'NI',
    targetCourt:     'LG Hannover',
    deutschLevel:    'C2',
    educationLevel:  'Fachabitur Wirtschaft + Kauffrau Groß-/Außenhandel IHK',
    status:          'analyzed',
    waitingFor:      'speak2',
    identifiedAt:    new Date('2026-05-01'),
    analyzedAt:      new Date('2026-05-20'),
    notes: `Muttersprache: Tamil (Jaffna-Dialekt). Deutsch: Muttersprachlich (seit Alter 7 in DE). Staatsangehörigkeit: Deutsch. 36 Jahre.
Fachabitur Wirtschaft (2011, Note 2,5). Kauffrau Groß-/Außenhandel IHK (2019, 84%). Stellv. Kassenleitung Stadt Hann. Münden (seit 2023).
KEINE Dolmetscher/Übersetzer-Erfahrung. KEINE Rechtssprache-Ausbildung. CV + Zertifikate vorhanden.
Rechtslage (geklärt 20.05.2026): NJG §23 verweist auf §4 GDolmG für fachliche Eignung.
§4 GDolmG (alternative Nachweise) GILT AUCH FÜR ÜBERSETZER! Tamil wird in NDS NICHT geprüft → §4 anwendbar.
Besonderes Bedürfnis: 5.000-8.000 Tamilen in Niedersachsen.
NUR Ermächtigung als Übersetzerin (NICHT Beeidigung als Dolmetscherin - einfacher!).
Timeline:
  1. Rechtssprache-Seminar (BDÜ, 500€, 6 Monate)
  2. Portfolio aufbauen (10-15 Probeübersetzungen)
  3. Antrag LG Hannover
Kosten speak2: 1.000-1.500€. Timeline: 6-18 Monate. Erfolgschance: 55-65% (inkl. Risiko-Szenario).`,
  })

  // ═══════════════════════════════════════════════════════════════════════
  // PRIORITÄT D — Nicht mehr aktiv
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n📋 Priorität D — Ausgeschieden\n')

  // 12. Bunyodbek Bustonov — Usbekisch, Frankfurt HE, REAGIERT NICHT
  await createCandidate({
    ref:             'SP-2026-012',
    firstName:       'Bunyodbek',
    lastName:        'Bustonov',
    nativeLanguage:  'Usbekisch',
    languagePair:    'Usbekisch ↔ Deutsch',
    countryOfOrigin: 'Usbekistan',
    currentCity:     'Frankfurt am Main',
    bundeslandCode:  'HE',
    targetCourt:     'LG Frankfurt',
    status:          'dropped',
    waitingFor:      'candidate',
    dropReason:      'Reagiert nicht mehr auf Kontaktversuche. Letzte Kontaktaufnahme ohne Reaktion.',
    identifiedAt:    new Date('2026-01-15'),
    analyzedAt:      new Date('2026-01-20'),
    droppedAt:       new Date('2026-04-01'),
    notes: `Muttersprache: Usbekisch. Kontaktdaten noch zu extrahieren.
Weg: LG Frankfurt (Hessen) über Hessische Lehrkräfteakademie.
Status: Reagiert nicht mehr auf Kontaktversuche. Als Kandidat gestrichen.`,
  })

  // ═══════════════════════════════════════════════════════════════════════
  // Create follow-up tasks for active candidates
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n📅 Erstelle Follow-up Tasks...\n')

  const juraev = await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-001' } })
  const usmonov = await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-002' } })
  const negash = await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-003' } })
  const tajammol = await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-004' } })
  const guri = await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-005' } })
  const markiza = await prisma.candidate.findUnique({ where: { candidateRef: 'SP-2026-006' } })

  const tasks = [
    {
      candidateId:  juraev!.id,
      title:        'Anfrage an OLG Naumburg senden',
      description:  'Korrekte E-Mail: olg@justiz.sachsen-anhalt.de (NICHT poststelle@...)\nUnterlagen komplett machen und Portfolio aufbauen.',
      dueAt:        new Date('2026-05-27'), // this week
      priority:     'urgent' as const,
    },
    {
      candidateId:  usmonov!.id,
      title:        'Vertrag-Nachfassung: Hat Faridjon unterschrieben?',
      description:  'Vertrag seit Januar 2026 ausstehend. Universitätsabschlüsse apostillieren lassen besprechen.',
      dueAt:        new Date('2026-05-22'), // immediate
      priority:     'urgent' as const,
    },
    {
      candidateId:  negash!.id,
      title:        'Vertrag unterschreiben lassen (Herr Negash)',
      description:  'Kontaktdaten aus Chats extrahieren und Vertrag einfordern. Hessen-Prüfung November 2026 – Rechtssprache-Kurs bereits jetzt starten.',
      dueAt:        new Date('2026-05-27'),
      priority:     'high' as const,
    },
    {
      candidateId:  tajammol!.id,
      title:        'Behshad Tajammol anrufen / anschreiben',
      description:  'Kostenstruktur klarstellen: speak2 übernimmt Großteil (~900-1.200€), er zahlt nur ~100-250€ für eigene Dokumente. Zögert wegen Eigenkosten.',
      dueAt:        new Date('2026-05-27'),
      priority:     'high' as const,
    },
    {
      candidateId:  guri!.id,
      title:        'Elinda Guri erneut kontaktieren',
      description:  'Outline wurde gesendet, noch kein Feedback. Nochmal nachfassen.',
      dueAt:        new Date('2026-06-03'),
      priority:     'medium' as const,
    },
    {
      candidateId:  markiza!.id,
      title:        'Thomas: Karlsruhe (Frau Gebhardt) kontaktieren',
      description:  'Thomas Schlegtendal soll RP Karlsruhe, Referat 76 kontaktieren: Frau Annette Gebhardt, Tel: 0721-926 4627, Annette.Gebhardt@rpk.bwl.de\nUnterlagen: Bachelor-Zeugnis, Transcript of Records, Apostille.',
      dueAt:        new Date('2026-05-22'), // this week — urgent
      priority:     'urgent' as const,
    },
  ]

  for (const task of tasks) {
    await prisma.task.create({
      data: {
        ...task,
        isAutomated: false,
        createdById: ramon.id,
      },
    })
    console.log(`  📌 Task: "${task.title}"`)
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════
  const count = await prisma.candidate.count()
  const taskCount = await prisma.task.count()

  console.log(`
╔══════════════════════════════════════════════════════╗
║           ✅  Migration abgeschlossen!               ║
╠══════════════════════════════════════════════════════╣
║  Kandidaten in DB: ${String(count).padEnd(34)}║
║  Tasks erstellt:   ${String(taskCount).padEnd(34)}║
╠══════════════════════════════════════════════════════╣
║  Status-Übersicht:                                   ║
║    contract_signed  → 1  (Juraev)                    ║
║    contract_sent    → 2  (Usmonov, Negash)            ║
║    outline_sent     → 3  (Tajammol, Guri, Markiza)   ║
║    analyzed         → 4  (Makhmudov, Gadamauri,      ║
║                           Taasoli, Piratheepan)      ║
║    identified       → 1  (Nareshelashvili)           ║
║    dropped          → 1  (Bustonov)                  ║
╚══════════════════════════════════════════════════════╝

👉  Öffne http://localhost:5174 um die Kandidaten im Kanban zu sehen.
`)
}

main()
  .catch(err => {
    console.error('❌ Migration fehlgeschlagen:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
