/**
 * ANTON — Antragspaket-Generator
 * PAULA — Diana Physical Task Generator
 * MAX   — Gericht-Monitor (alle 3 Wochen)
 */
import Anthropic from '@anthropic-ai/sdk'
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

export const antonRoutes: FastifyPluginAsync = async (fastify) => {

  // ══════════════════════════════════════════════════════════════════════
  // ANTON: Antragspaket generieren
  // POST /api/anton/:candidateId/generate
  // ══════════════════════════════════════════════════════════════════════
  fastify.post('/:candidateId/generate', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { candidateId } = request.params as { candidateId: string }
    const user = (request as any).user

    const candidate = await fastify.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        bundesland: true,
        documentChecklist: true,
      },
    })
    if (!candidate) return reply.code(404).send({ error: 'Kandidat nicht gefunden' })

    const bl = candidate.bundesland
    const apiKey = process.env.ANTHROPIC_API_KEY

    // ── ANTON: Anschreiben generieren ──────────────────────────────────
    let anschreiben = ''
    let ergaenzendeErklaerung = ''

    if (apiKey) {
      const client = new Anthropic({ apiKey })

      // Anschreiben
      const anschreibenPrompt = `Du bist ANTON, ein Experte für Dolmetscher- und Übersetzerrecht in Deutschland.

Erstelle ein professionelles Anschreiben an ${bl?.courtName || 'das zuständige Gericht'} für folgende Person:

KANDIDAT:
Name: ${candidate.firstName} ${candidate.lastName}
Sprache: ${candidate.languagePair}
Wohnort: ${candidate.currentCity}
Bundesland: ${bl?.bundeslandName || candidate.bundesland}
Deutschniveau: ${candidate.deutschLevel || 'C1'}
Ausbildung: ${candidate.educationLevel || 'Hochschulabschluss'}
Herkunftsland: ${candidate.countryOfOrigin || 'unbekannt'}

GERICHT: ${bl?.courtName || 'zuständiges Gericht'}
RECHTSGRUNDLAGE: ${bl?.legalBasisCitation || 'GDolmG §4'}
AUSNAHMEREGELUNG: ${bl?.hasExceptionRule ? 'Ja — für seltene Sprachen' : 'Nein'}
RECHTSSPRACHE ERFORDERLICH: ${bl?.specialNotes?.includes('NICHT für Übersetzer') ? 'NEIN (nur Dolmetscher)' : 'Ja'}

Erstelle ein formelles Anschreiben mit:
1. Betreff: Antrag auf Ermächtigung als Übersetzer für [Sprache]
2. Bezug auf die Ausnahmeregelung für seltene Sprachen (wenn vorhanden)
3. Kurze Darstellung der Qualifikationen
4. Beiliegend: Auflistung der beigelegten Dokumente
5. Bitte um Ermächtigung

Schreibe auf Deutsch, professionell und präzise. NUR den Brieftext, keine Erklärungen.`

      const anschreibenRes = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{ role: 'user', content: anschreibenPrompt }],
      })
      anschreiben = (anschreibenRes.content[0] as any).text

      // Ergänzende Erklärung (Formular-Daten)
      ergaenzendeErklaerung = `ERGÄNZENDE ERKLÄRUNG
(Vorlage LG ${bl?.bundeslandName || 'Bayern'})

Ich, ${candidate.firstName} ${candidate.lastName},
geboren am: _______________
wohnhaft in: ${candidate.currentCity || '_______________'}

erkläre hiermit:

1. Ich beherrsche die deutsche Sprache (${candidate.deutschLevel || 'C1'})
   und die Sprache ${candidate.nativeLanguage} in Wort und Schrift.

2. Meine fachliche Qualifikation für die Tätigkeit als Übersetzer/in:
   ${candidate.educationLevel || '_______________'}
   (Abschluss erworben in: ${candidate.countryOfOrigin || '_______________'})

3. Ich beantrage die Ermächtigung ausschließlich als ÜBERSETZER/IN
   (nicht als Dolmetscher/in).

4. Über mich sind keine Verfahren anhängig, die einer Ermächtigung
   entgegenstehen würden.

Ort, Datum: ${candidate.currentCity || '_______________'}, _______________

Unterschrift: _______________________________
              ${candidate.firstName} ${candidate.lastName}`
    } else {
      anschreiben = `[Anschreiben wird generiert sobald ANTHROPIC_API_KEY gesetzt ist]\n\nPlatzhalter-Anschreiben für ${candidate.firstName} ${candidate.lastName}`
      ergaenzendeErklaerung = `[Ergänzende Erklärung — manuell ausfüllen]`
    }

    // ── Dokument-Checkliste für das Antragspaket ───────────────────────
    const checklistItems = [
      { item: 'Anschreiben an Gericht',           status: '✅ Generiert' },
      { item: 'Ergänzende Erklärung',             status: '✅ Generiert' },
      { item: 'Tabellarischer Lebenslauf (auf Deutsch)', status: candidate.documentChecklist.some(d => d.documentType === 'cv' && d.status === 'received') ? '✅ Vorhanden' : '❌ Fehlt' },
      { item: `Zeugnisse (Kopien mit Apostille)`, status: candidate.documentChecklist.some(d => d.documentType === 'apostille' && d.status === 'received') ? '✅ Vorhanden' : '❌ Fehlt' },
      { item: 'Beglaubigte Übersetzungen der Zeugnisse', status: '⏳ speak2 organisiert' },
      { item: `Sprachzertifikat Deutsch (${candidate.deutschLevel || 'C1'})`, status: candidate.documentChecklist.some(d => d.documentType === 'language_certificate' && d.status === 'received') ? '✅ Vorhanden' : '❌ Fehlt' },
      { item: 'Führungszeugnis (Belegart 0)', status: '📬 Wird direkt ans LG geschickt' },
    ]

    // ── Antragspaket als Note speichern ────────────────────────────────
    const antragspaket = {
      anschreiben,
      ergaenzendeErklaerung,
      checklist:   checklistItems,
      courtName:   bl?.courtName || 'zuständiges Gericht',
      courtAddress: `${bl?.courtName || 'Gericht'}\nz.Hd. der Dolmetscherverwaltung\n[Adresse eintragen]`,
      generatedAt: new Date().toISOString(),
      generatedBy: user.fullName,
    }

    // Notiz anhängen
    await fastify.prisma.candidate.update({
      where: { id: candidateId },
      data: {
        notes: (candidate.notes || '') + `\n\n[ANTON ${new Date().toLocaleDateString('de-DE')}] Antragspaket generiert von ${user.fullName}.\nStatus: Wartet auf Ramóns Freigabe.\n\n=== ANSCHREIBEN ===\n${anschreiben}\n\n=== ERGÄNZENDE ERKLÄRUNG ===\n${ergaenzendeErklaerung}`,
      },
    })

    // ── DOMINIK-Task: Ramon zur Freigabe ──────────────────────────────
    await fastify.prisma.task.create({
      data: {
        candidateId,
        assignedToId: user.id,
        title:        `📋 [RAMON] Antragspaket prüfen & freigeben: ${candidate.firstName} ${candidate.lastName}`,
        description:  `ANTON hat das Antragspaket für ${candidate.firstName} ${candidate.lastName} generiert.

PRÜFLISTE:
${checklistItems.map(c => `${c.status} ${c.item}`).join('\n')}

Nach Freigabe → PAULA erstellt Diana-Task für physischen Versand.
Gericht: ${bl?.courtName || 'unbekannt'}
Rechtsgrundlage: ${bl?.legalBasisCitation || 'GDolmG §4'}`,
        dueAt:        new Date(),
        priority:     'high',
        isAutomated:  true,
        createdById:  user.id,
      },
    })

    return {
      success: true,
      anschreiben,
      ergaenzendeErklaerung,
      checklist: checklistItems,
      message:   'Antragspaket generiert. Ramon muss es jetzt freigeben.',
    }
  })

  // ── GET /api/anton/:candidateId/package — Antragspaket abrufen ────────
  fastify.get('/:candidateId/package', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { candidateId } = request.params as { candidateId: string }
    const candidate = await fastify.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { bundesland: true, documentChecklist: true },
    })
    if (!candidate) return reply.code(404).send({ error: 'Nicht gefunden' })

    // Extrahiere Anschreiben aus Notizen
    const notes = candidate.notes || ''
    const anschreibenMatch = notes.match(/=== ANSCHREIBEN ===([\s\S]*?)=== ERGÄNZENDE ERKLÄRUNG ===/)
    const erklaerungMatch  = notes.match(/=== ERGÄNZENDE ERKLÄRUNG ===([\s\S]*)$/)

    return {
      hasPackage:            notes.includes('[ANTON'),
      anschreiben:           anschreibenMatch ? anschreibenMatch[1].trim() : null,
      ergaenzendeErklaerung: erklaerungMatch  ? erklaerungMatch[1].trim()  : null,
      courtName:             candidate.bundesland?.courtName,
      bundesland:            candidate.bundesland,
    }
  })

  // ══════════════════════════════════════════════════════════════════════
  // PAULA: Freigabe → Diana-Task erstellen
  // POST /api/anton/:candidateId/approve
  // ══════════════════════════════════════════════════════════════════════
  fastify.post('/:candidateId/approve', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { candidateId } = request.params as { candidateId: string }
    const { taskId } = request.body as { taskId?: string }
    const user = (request as any).user

    const candidate = await fastify.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { bundesland: true },
    })
    if (!candidate) return reply.code(404).send({ error: 'Nicht gefunden' })

    const bl = candidate.bundesland
    const diana = await fastify.prisma.user.findFirst({ where: { email: 'diana@speak2.de' } })
    const thomas = await fastify.prisma.user.findFirst({ where: { email: 'thomas@speak2.de' } })

    // ── PAULA: Diana-Task (nur physisch, kein Ermessen) ────────────────
    await fastify.prisma.task.create({
      data: {
        candidateId,
        assignedToId: diana?.id ?? user.id,
        title:        `🖨️ [DIANA] Drucken + Einschreiben: ${candidate.firstName} ${candidate.lastName}`,
        description:  `AUFGABE (kein Ermessen erforderlich):

1. DRUCKEN (${candidate.firstName} ${candidate.lastName}):
   • Anschreiben (1 Seite)
   • Ergänzende Erklärung (1 Seite)
   • Lebenslauf (aus Sharepoint-Ordner)
   • Zeugniskopien mit Apostille (aus Sharepoint-Ordner)
   • Beglaubigte Übersetzungen (aus Sharepoint-Ordner)
   • Sprachzertifikat (aus Sharepoint-Ordner)

2. EINSCHREIBEN senden an:
   ${bl?.courtName || 'Gericht'}
   z.Hd. der Dolmetscherverwaltung
   ${bl?.courtAddress || '[Adresse aus Rechtsbibliothek]'}

3. QUITTUNG (Einschreiben-Beleg) scannen und hochladen.

4. RÜCKMELDUNG: E-Mail an info@speak2.de: "Antrag [${candidate.candidateRef}] versendet am [Datum], Sendungsnummer: [Nr.]"

NICHT: Kein E-Mail-Kontakt mit dem Gericht. Keine Entscheidungen treffen.`,
        dueAt:        new Date(Date.now() + 24 * 60 * 60 * 1000),
        priority:     'high',
        isAutomated:  true,
        createdById:  user.id,
      },
    })

    // ── MAX: Monitor-Kette starten ─────────────────────────────────────
    // Erster Status-Check in 3 Wochen (nach Versand)
    const firstCheck = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
    await fastify.prisma.task.create({
      data: {
        candidateId,
        assignedToId: thomas?.id ?? user.id,
        title:        `📞 [MAX→THOMAS] Status erfragen: ${candidate.firstName} ${candidate.lastName}`,
        description:  `[MAX] Erster Gerichts-Status-Check (3 Wochen nach Antragsversand)

THOMAS ANRUFEN ODER MAILEN:
Kontakt: ${bl?.courtContact || bl?.courtName || 'Gericht'}
${bl?.courtContact ? `Ansprechperson: ${bl.courtContact}` : ''}
Erreichbarkeit: laut Gericht (z.B. Di+Do 8-14:30)

FRAGE: "Ich rufe an bezüglich des Antrags auf Ermächtigung als Übersetzer für ${candidate.nativeLanguage} von Herrn/Frau ${candidate.firstName} ${candidate.lastName}. Wurde der Antrag bearbeitet? Gibt es Rückfragen oder ein Aktenzeichen?"

Ergebnis bitte direkt in der App eintragen (KI-Update → freier Text).
MAX erstellt dann automatisch den nächsten Check in 3 Wochen.`,
        dueAt:        firstCheck,
        priority:     'medium',
        isAutomated:  true,
        createdById:  user.id,
      },
    })

    // Kandidat auf certification_in_progress setzen
    await fastify.prisma.candidate.update({
      where: { id: candidateId },
      data: {
        status:                'certification_in_progress',
        waitingFor:            'court',
        certificationStartedAt: new Date(),
      },
    })

    await fastify.prisma.pipelineEvent.create({
      data: {
        candidateId,
        fromStatus:    'contract_signed',
        toStatus:      'certification_in_progress',
        triggeredById: user.id,
        isAutomated:   false,
        notes:         `Antragspaket von Ramon freigegeben. PAULA-Task für Diana + MAX-Monitor gestartet.`,
      },
    })

    // Freigabe-Task abschließen
    if (taskId) {
      await fastify.prisma.task.update({
        where: { id: taskId },
        data: { status: 'done', completedAt: new Date(), completedById: user.id },
      })
    }

    return { success: true, message: 'Freigegeben. Diana-Task und MAX-Monitor aktiv.' }
  })

  // ══════════════════════════════════════════════════════════════════════
  // MAX: Nächsten Monitor-Check erstellen
  // POST /api/anton/:candidateId/next-check
  // (wird aufgerufen wenn Thomas einen Check abgeschlossen hat)
  // ══════════════════════════════════════════════════════════════════════
  fastify.post('/:candidateId/next-check', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { candidateId } = request.params as { candidateId: string }
    const { checkNumber = 2, outcome } = request.body as { checkNumber?: number; outcome?: string }
    const user = (request as any).user

    const candidate = await fastify.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { bundesland: true },
    })
    if (!candidate) return reply.code(404).send({ error: 'Nicht gefunden' })

    if (candidate.status === 'certified' || candidate.status === 'dropped') {
      return { success: false, message: 'Kein weiterer Check nötig (abgeschlossen)' }
    }

    const bl = candidate.bundesland
    const thomas = await fastify.prisma.user.findFirst({ where: { email: 'thomas@speak2.de' } })

    // Eskalation nach 3 erfolglosen Checks
    const priority = checkNumber >= 4 ? 'urgent' : checkNumber >= 3 ? 'high' : 'medium'
    const escalation = checkNumber >= 4
      ? '\n⚠️ ESKALATION: 4+ Checks ohne Ergebnis. Ramón direkt informieren!'
      : ''

    const nextCheck = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
    await fastify.prisma.task.create({
      data: {
        candidateId,
        assignedToId: thomas?.id ?? user.id,
        title:        `📞 [MAX→THOMAS] Status-Check #${checkNumber}: ${candidate.firstName} ${candidate.lastName}`,
        description:  `[MAX] Gerichts-Status-Check #${checkNumber}
${outcome ? `Letztes Ergebnis: "${outcome}"` : ''}

Kontakt: ${bl?.courtContact || bl?.courtName || 'Gericht'}
Frage: "Gibt es einen Bearbeitungsstand zum Ermächtigungsantrag von ${candidate.firstName} ${candidate.lastName} (${candidate.nativeLanguage})?"

Ergebnis in App eintragen. MAX erstellt automatisch Check #${checkNumber + 1} in 3 Wochen.${escalation}`,
        dueAt:        nextCheck,
        priority,
        isAutomated:  true,
        createdById:  user.id,
      },
    })

    return { success: true, nextCheckNumber: checkNumber + 1, dueAt: nextCheck }
  })
}
