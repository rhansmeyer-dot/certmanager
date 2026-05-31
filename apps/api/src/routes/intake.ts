import Anthropic from '@anthropic-ai/sdk'
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const intakeSchema = z.object({
  // Persönliche Daten
  firstName:       z.string().min(1),
  lastName:        z.string().min(1),
  email:           z.string().email(),
  phone:           z.string().optional(),
  currentCity:     z.string().min(1),
  bundeslandCode:  z.string().min(2),
  countryOfOrigin: z.string().min(1),

  // Sprache
  nativeLanguage:  z.string().min(1),
  deutschLevel:    z.string().min(1),   // A1-C2 / Muttersprache
  yearsInGermany:  z.number().min(0),
  germanCitizen:   z.boolean(),
  citizenshipYear: z.number().optional(), // falls beantragt: Jahr der Einbürgerung

  // Qualifikation
  highestDegree:     z.string().min(1),  // Bachelor / Master / Diplom / Abitur / Berufsausbildung
  degreeField:       z.string().min(1),  // z.B. "Germanistik", "Lehramt Mathematik"
  degreeCountry:     z.string().min(1),
  degreeYear:        z.number().optional(),
  hasTranslationExp: z.boolean(),
  translationYears:  z.number().optional(),
  additionalInfo:    z.string().optional(), // Freitext
})

// Bekannte Bundesland-Regeln für die KI-Bewertung
const BUNDESLAND_RULES: Record<string, any> = {
  BY:  { name: 'Bayern',           court: 'LG Augsburg/München', exception: true,  citizenRequired: true,  rechtssprache: false, difficulty: 'easy' },
  SA:  { name: 'Sachsen-Anhalt',   court: 'OLG Naumburg',        exception: true,  citizenRequired: false, rechtssprache: false, difficulty: 'easy' },
  SN:  { name: 'Sachsen',          court: 'OLG Dresden',          exception: true,  citizenRequired: false, rechtssprache: true,  difficulty: 'easy' },
  NI:  { name: 'Niedersachsen',    court: 'LG Hannover',          exception: true,  citizenRequired: false, rechtssprache: false, difficulty: 'easy' },
  BB:  { name: 'Brandenburg',      court: 'LG Potsdam',           exception: true,  citizenRequired: false, rechtssprache: false, difficulty: 'easy' },
  HE:  { name: 'Hessen',           court: 'Lehrkräfteakademie',   exception: true,  citizenRequired: false, rechtssprache: true,  difficulty: 'medium', examDate: 'November' },
  HB:  { name: 'Bremen',           court: 'OLG Bremen',           exception: false, citizenRequired: false, rechtssprache: false, difficulty: 'medium' },
  HH:  { name: 'Hamburg',          court: 'LG Hamburg',           exception: false, citizenRequired: false, rechtssprache: false, difficulty: 'medium' },
  BW:  { name: 'Baden-Württemberg',court: 'RP Karlsruhe',         exception: false, citizenRequired: false, rechtssprache: true,  difficulty: 'complex' },
  NW:  { name: 'Nordrhein-Westfalen', court: 'OLG Köln/Hamm',    exception: false, citizenRequired: false, rechtssprache: false, difficulty: 'medium' },
  SH:  { name: 'Schleswig-Holstein', court: 'OLG Schleswig',      exception: false, citizenRequired: false, rechtssprache: false, difficulty: 'medium' },
  RP:  { name: 'Rheinland-Pfalz',  court: 'LG Koblenz/Mainz',    exception: false, citizenRequired: false, rechtssprache: false, difficulty: 'medium' },
  MV:  { name: 'Mecklenburg-Vorpommern', court: 'OLG Rostock',   exception: true,  citizenRequired: false, rechtssprache: false, difficulty: 'easy' },
  TH:  { name: 'Thüringen',        court: 'OLG Jena',             exception: true,  citizenRequired: false, rechtssprache: false, difficulty: 'easy' },
  ST:  { name: 'Sachsen-Anhalt',   court: 'OLG Naumburg',        exception: true,  citizenRequired: false, rechtssprache: false, difficulty: 'easy' },
  BE:  { name: 'Berlin',           court: 'LG Berlin',            exception: false, citizenRequired: false, rechtssprache: false, difficulty: 'medium' },
  SL:  { name: 'Saarland',         court: 'OLG Saarbrücken',      exception: false, citizenRequired: false, rechtssprache: false, difficulty: 'medium' },
}

export const intakeRoutes: FastifyPluginAsync = async (fastify) => {

  // ── GET /api/intake/bundeslaender — für das Formular ───────────────────
  fastify.get('/bundeslaender', async () => {
    return Object.entries(BUNDESLAND_RULES).map(([code, r]) => ({
      code,
      name: r.name,
      difficulty: r.difficulty,
    }))
  })

  // ── POST /api/intake — Bewerbung einreichen ─────────────────────────────
  fastify.post('/', async (request, reply) => {
    const data = intakeSchema.parse(request.body)
    const bl = BUNDESLAND_RULES[data.bundeslandCode] || {}

    // ── SIEGFRIED: KI-Erstbewertung ────────────────────────────────────────
    const apiKey = process.env.ANTHROPIC_API_KEY
    let assessment: any = null

    if (apiKey) {
      const client = new Anthropic({ apiKey })

      const prompt = `Du bist SIEGFRIED, ein KI-Screening-Agent für speak2.
speak2 übernimmt Kosten der Ermächtigung als Übersetzer bei deutschen Gerichten (400–2.500€)
gegen 4-Jahres-Kooperationsvertrag (75/25 bei Dolmetschen, Festpreise bei Übersetzungen).

KANDIDATENPROFIL:
Name: ${data.firstName} ${data.lastName}
Sprache: ${data.nativeLanguage} (Muttersprache)
Bundesland: ${bl.name || data.bundeslandCode}
Zuständiges Gericht: ${bl.court || 'unbekannt'}
Deutsch: ${data.deutschLevel}
Jahre in Deutschland: ${data.yearsInGermany}
Deutsche Staatsbürgerschaft: ${data.germanCitizen ? 'JA' : 'NEIN'}${data.citizenshipYear ? ` (beantragt, erwartet ${data.citizenshipYear})` : ''}
Herkunftsland: ${data.countryOfOrigin}
Höchster Abschluss: ${data.highestDegree} in ${data.degreeField} (${data.degreeCountry}${data.degreeYear ? `, ${data.degreeYear}` : ''})
Übersetzungserfahrung: ${data.hasTranslationExp ? `${data.translationYears || '?'} Jahre` : 'Keine'}
Zusätzliche Infos: ${data.additionalInfo || 'keine'}

BUNDESLAND-REGELN für ${bl.name || data.bundeslandCode}:
- Ausnahmeregelung für seltene Sprachen: ${bl.exception ? 'JA' : 'NEIN'}
- Deutsche Staatsbürgerschaft erforderlich: ${bl.citizenRequired ? 'JA' : 'NEIN'}
- Rechtssprache-Nachweis (als Übersetzer): ${bl.rechtssprache ? 'JA (ca. 500€)' : 'NEIN'}
- Schwierigkeit: ${bl.difficulty}
${bl.examDate ? `- Prüfungstermin nur: ${bl.examDate}` : ''}

BEWERTUNGSAUFGABE:
1. Ist ${data.nativeLanguage} eine seltene Sprache (kaum ermächtigte Übersetzer in Deutschland)?
2. Blocker identifizieren (was verhindert aktuell die Ermächtigung?)
3. Lösungswege für jeden Blocker vorschlagen
4. Erfolgswahrscheinlichkeit (0-100%) schätzen
5. Empfehlung: ANNEHMEN / ABLEHNEN / SPÄTER (z.B. wenn Einbürgerung läuft)

Antworte NUR mit JSON:
{
  "isRareLanguage": true/false,
  "rarityExplanation": "...",
  "marketDemand": "hoch/mittel/niedrig",
  "successProbability": 75,
  "blockers": [{"issue": "...", "severity": "kritisch/hoch/mittel", "solution": "...", "timeline": "..."}],
  "recommendation": "ANNEHMEN/ABLEHNEN/SPÄTER",
  "recommendationReason": "...",
  "estimatedCost": 800,
  "estimatedTimeline": "3-6 Monate",
  "summaryDE": "2-3 Sätze Zusammenfassung für Ramon auf Deutsch",
  "nextStep": "Was Ramon als erstes tun soll"
}`

      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        })

        const block = response.content[0]
        if (block.type === 'text') {
          const cleaned = block.text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
          assessment = JSON.parse(cleaned)
        }
      } catch (e) {
        fastify.log.error('Siegfried error:', e)
      }
    }

    // ── Kandidat als "pending" speichern ───────────────────────────────────
    const languagePair = `${data.nativeLanguage} ↔ Deutsch`
    const blRecord = await fastify.prisma.bundeslandRule.findUnique({
      where: { bundeslandCode: data.bundeslandCode },
    })

    // Alle Admins für Zuweisung
    const admin = await fastify.prisma.user.findFirst({ where: { role: 'admin' } })

    const candidate = await fastify.prisma.candidate.create({
      data: {
        candidateRef:    await generateRef(fastify.prisma),
        firstName:       data.firstName,
        lastName:        data.lastName,
        email:           data.email,
        phone:           data.phone ?? null,
        nativeLanguage:  data.nativeLanguage,
        languagePair,
        countryOfOrigin: data.countryOfOrigin,
        currentCity:     data.currentCity,
        bundeslandId:    blRecord?.id ?? null,
        deutschLevel:    data.deutschLevel,
        educationLevel:  `${data.highestDegree} ${data.degreeField} (${data.degreeCountry})`,
        hasTranslationExp: data.hasTranslationExp,
        translationYears:  data.translationYears ?? null,
        source:          'intake-form',
        status:          'identified',
        waitingFor:      'speak2',
        notes: `SELF-INTAKE via Bewerbungsformular

STAATSANGEHÖRIGKEIT: ${data.germanCitizen ? 'Deutsch ✅' : `NICHT DEUTSCH ⚠️ (${data.countryOfOrigin})`}
${data.citizenshipYear ? `Einbürgerung beantragt, erwartet: ${data.citizenshipYear}` : ''}

${assessment ? `
=== SIEGFRIED-BEWERTUNG ===
Seltene Sprache: ${assessment.isRareLanguage ? 'JA' : 'NEIN'} — ${assessment.rarityExplanation}
Marktbedarf: ${assessment.marketDemand}
Erfolgswahrscheinlichkeit: ${assessment.successProbability}%
Empfehlung: ${assessment.recommendation}
Begründung: ${assessment.recommendationReason}
Geschätzte Kosten: ${assessment.estimatedCost}€
Timeline: ${assessment.estimatedTimeline}

BLOCKER:
${(assessment.blockers || []).map((b: any) => `• [${b.severity.toUpperCase()}] ${b.issue}\n  Lösung: ${b.solution} (${b.timeline})`).join('\n')}

ZUSAMMENFASSUNG: ${assessment.summaryDE}
NÄCHSTER SCHRITT: ${assessment.nextStep}
` : 'SIEGFRIED-Bewertung: ANTHROPIC_API_KEY nicht konfiguriert'}

ROHDATEN:
${JSON.stringify(data, null, 2)}`,
        assignedToId: admin?.id ?? null,
      },
    })

    // ── Task für Ramon: Entscheidung treffen ─────────────────────────────
    if (admin) {
      await fastify.prisma.task.create({
        data: {
          candidateId:  candidate.id,
          assignedToId: admin.id,
          title:        `🆕 [DOMINIK] Neue Bewerbung: ${data.firstName} ${data.lastName} (${data.nativeLanguage})`,
          description:  `Neue Bewerbung über das Intake-Formular eingegangen.
${assessment ? `SIEGFRIED-Empfehlung: ${assessment.recommendation} (${assessment.successProbability}% Erfolgswahrscheinlichkeit)\n${assessment.summaryDE}` : 'Bewertung ausstehend.'}

Aktion erforderlich: Bewerbung prüfen und entscheiden:
→ ANNEHMEN: Thomas anrufen lassen → Integration in Prozess
→ ABLEHNEN: Absage-E-Mail generieren und senden`,
          dueAt:    new Date(),
          priority: assessment?.recommendation === 'ABLEHNEN' ? 'medium' : 'urgent',
          isAutomated: true,
          createdById: admin.id,
        },
      })
    }

    return {
      success: true,
      candidateRef: candidate.candidateRef,
      message: 'Bewerbung eingegangen. Wir melden uns innerhalb von 2-3 Werktagen.',
      assessment: assessment ? {
        recommendation: assessment.recommendation,
        successProbability: assessment.successProbability,
      } : null,
    }
  })

  // ── GET /api/intake/pending — für Ramon: alle offenen Bewerbungen ────────
  fastify.get('/pending', {
    preHandler: [fastify.authenticate],
  }, async () => {
    const tasks = await fastify.prisma.task.findMany({
      where: {
        title: { startsWith: '🆕 [DOMINIK]' },
        status: 'pending',
      },
      include: {
        candidate: {
          select: {
            id: true, candidateRef: true, firstName: true, lastName: true,
            nativeLanguage: true, languagePair: true, currentCity: true,
            deutschLevel: true, status: true, notes: true,
            bundesland: { select: { bundeslandName: true, difficulty: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return tasks
  })

  // ── POST /api/intake/:candidateId/decide — Ramon entscheidet ────────────
  fastify.post('/:candidateId/decide', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { candidateId } = request.params as { candidateId: string }
    const { decision, taskId } = request.body as { decision: 'accept' | 'reject', taskId?: string }
    const user = (request as any).user

    const candidate = await fastify.prisma.candidate.findUnique({ where: { id: candidateId } })
    if (!candidate) return reply.code(404).send({ error: 'Nicht gefunden' })

    if (decision === 'accept') {
      await fastify.prisma.candidate.update({
        where: { id: candidateId },
        data: { status: 'analyzed', waitingFor: 'speak2' },
      })

      // Task für Thomas: anrufen
      await fastify.prisma.task.create({
        data: {
          candidateId,
          title: `📞 [THOMAS] Anrufen: ${candidate.firstName} ${candidate.lastName} — Interesse bestätigen`,
          description: `Kandidat wurde von SIEGFRIED positiv bewertet.
Bitte anrufen und folgende Punkte klären:
1. Grundsätzliches Interesse an der Zusammenarbeit mit speak2 bestätigen
2. Fragen zum Kooperationsvertrag (Laufzeit 4 Jahre, 25% Provision Dolmetschen)
3. Nächster Schritt: Outline/Hinweisblatt per E-Mail schicken
4. Ergebnis direkt in der App eintragen!`,
          dueAt:        new Date(Date.now() + 24 * 60 * 60 * 1000), // morgen
          priority:     'high',
          isAutomated:  true,
          createdById:  user.id,
        },
      })
    } else {
      await fastify.prisma.candidate.update({
        where: { id: candidateId },
        data: { status: 'dropped', waitingFor: 'candidate', dropReason: 'Absage durch Ramon nach SIEGFRIED-Bewertung' },
      })
    }

    // Dominik-Task abschließen
    if (taskId) {
      await fastify.prisma.task.update({
        where: { id: taskId },
        data: { status: 'done', completedAt: new Date(), completedById: user.id },
      })
    }

    return { success: true, decision }
  })
}

async function generateRef(prisma: any): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.candidate.count()
  return `SP-${year}-${String(count + 1).padStart(3, '0')}`
}
