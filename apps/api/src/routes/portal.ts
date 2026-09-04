/**
 * OLIVER — Onboarding Agent
 * DORA   — Dokument-Upload-Portal
 *
 * Kandidaten-Portal: kein Login nötig, nur Token-basiert
 * Jeder Kandidat bekommt einen eindeutigen Link
 */
import { FastifyPluginAsync } from 'fastify'
import { createHash } from 'crypto'
import { extname } from 'path'
import { storageConfigured, uploadObject, createSignedUrl } from '../lib/storage'
import { publicBaseUrl } from '../lib/urls'

// Erlaubte Werte (Schutz gegen ungültige Eingaben → sonst Prisma-500)
const DOC_TYPES = ['cv', 'contract_unsigned', 'contract_signed', 'apostille',
  'language_certificate', 'legal_language_cert', 'sample_translation',
  'embassy_letter', 'court_application', 'court_correspondence', 'other'] as const
const CHECKLIST_STATUSES = ['received', 'requested', 'missing_critical', 'not_required'] as const
const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'] as const
const ALLOWED_MIME = ['application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png'] as const

// Token generieren (URL-safe)
function makeToken(candidateId: string): string {
  const secret = process.env.JWT_SECRET || 'certmanager-secret'
  return createHash('sha256')
    .update(candidateId + secret)
    .digest('hex')
    .slice(0, 32)
}

function verifyToken(candidateId: string, token: string): boolean {
  return makeToken(candidateId) === token
}

export const portalRoutes: FastifyPluginAsync = async (fastify) => {

  // ── GET /api/portal/:token — Kandidatenprofil laden ────────────────────
  // Token = sha256(candidateId + secret) — kein Login nötig
  fastify.get('/:candidateId/:token', async (request, reply) => {
    const { candidateId, token } = request.params as { candidateId: string; token: string }

    if (!verifyToken(candidateId, token)) {
      return reply.code(403).send({ error: 'Ungültiger Link' })
    }

    const candidate = await fastify.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        bundesland: true,
        documentChecklist: true,
        contracts: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })
    if (!candidate) return reply.code(404).send({ error: 'Nicht gefunden' })

    return {
      candidateRef:          candidate.candidateRef,
      firstName:             candidate.firstName,
      lastName:              candidate.lastName,
      languagePair:          candidate.languagePair,
      status:                candidate.status,
      onboardingCompletedAt: (candidate as any).onboardingCompletedAt ?? null,
      phone:                 candidate.phone,
      deutschLevel:          candidate.deutschLevel,
      nativeLanguage:        candidate.nativeLanguage,
      educationLevel:        candidate.educationLevel,
      hasTranslationExp:     candidate.hasTranslationExp,
      bundesland:    candidate.bundesland ? {
        name:         candidate.bundesland.bundeslandName,
        court:        candidate.bundesland.courtName,
        estimatedDays: candidate.bundesland.estimatedDurationDays,
        costMin:      candidate.bundesland.typicalCostMin,
        costMax:      candidate.bundesland.typicalCostMax,
      } : null,
      contract: candidate.contracts[0] ? {
        id:     candidate.contracts[0].id,
        status: candidate.contracts[0].status,
        sentAt: candidate.contracts[0].sentAt,
      } : null,
      documentChecklist: candidate.documentChecklist.map(d => ({
        id:           d.id,
        documentType: d.documentType,
        status:       d.status,
        notes:        d.notes,
      })),
    }
  })

  // ── POST /api/portal/:candidateId/:token/sign — Vertrag unterschreiben ─
  fastify.post('/:candidateId/:token/sign', async (request, reply) => {
    const { candidateId, token } = request.params as { candidateId: string; token: string }
    const { signatureName, agreeToTerms } = request.body as { signatureName: string; agreeToTerms: boolean }

    if (!verifyToken(candidateId, token)) return reply.code(403).send({ error: 'Ungültiger Link' })
    if (!agreeToTerms || !signatureName) return reply.code(400).send({ error: 'Zustimmung und Name erforderlich' })

    const candidate = await fastify.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { contracts: { orderBy: { createdAt: 'desc' }, take: 1 } },
    })
    if (!candidate) return reply.code(404).send({ error: 'Nicht gefunden' })

    // Guard: kein Doppel-Signieren, kein "Vorspulen" eines inaktiven/abgeschlossenen Vorgangs.
    if (candidate.status === 'dropped') {
      return reply.code(409).send({ error: 'Dieser Vorgang ist nicht mehr aktiv.' })
    }
    if (candidate.status === 'contract_signed' || candidate.contracts[0]?.status === 'signed') {
      return reply.code(409).send({ error: 'Der Vertrag wurde bereits unterzeichnet.' })
    }

    const fromStatus = candidate.status
    const now = new Date()

    // Contract als signed markieren
    if (candidate.contracts[0]) {
      await fastify.prisma.contract.update({
        where: { id: candidate.contracts[0].id },
        data: { status: 'signed', signedAt: now },
      })
    } else {
      await fastify.prisma.contract.create({
        data: {
          candidateId,
          contractType:    'cooperation_4year',
          status:          'signed',
          revenueSharePct: 25,
          sentAt:          now,
          signedAt:        now,
        },
      })
    }

    // Kandidat → contract_signed
    await fastify.prisma.candidate.update({
      where: { id: candidateId },
      data: {
        status:          'contract_signed',
        waitingFor:      'speak2',
        contractSignedAt: now,
        notes: (candidate.notes || '') + `\n\n[${now.toLocaleDateString('de-DE')}] Vertrag digital unterzeichnet.
Digitale Unterschrift: "${signatureName}"
IP: ${(request as any).ip || 'unbekannt'}`,
      },
    })

    // Pipeline-Event
    await fastify.prisma.pipelineEvent.create({
      data: {
        candidateId,
        fromStatus:  fromStatus,
        toStatus:    'contract_signed',
        isAutomated: true,
        notes:       `Digitale Unterzeichnung via Kandidaten-Portal. Unterschrift: "${signatureName}"`,
      },
    })

    // Task für Ramon: Vertrag unterzeichnet → nächste Schritte
    const admin = await fastify.prisma.user.findFirst({ where: { role: 'admin' } })
    if (admin) {
      await fastify.prisma.task.create({
        data: {
          candidateId,
          assignedToId: admin.id,
          title:       `✅ Vertrag unterzeichnet: ${candidate.firstName} ${candidate.lastName}`,
          description: `${candidate.firstName} ${candidate.lastName} hat den Kooperationsvertrag digital unterzeichnet.
Nächste Schritte (DORA startet):
1. Willkommens-E-Mail senden
2. Dokument-Checkliste an Kandidaten senden
3. Beglaubigte Übersetzungen der Zeugnisse anfordern`,
          dueAt:       new Date(),
          priority:    'high',
          isAutomated: true,
          createdById: admin.id,
        },
      })
    }

    return { success: true, message: 'Vertrag erfolgreich unterzeichnet!' }
  })

  // ── POST /api/portal/:candidateId/:token/upload-request ─────────────────
  // DORA: Kandidat meldet welches Dokument er hochladen will
  fastify.post('/:candidateId/:token/document-status', async (request, reply) => {
    const { candidateId, token } = request.params as { candidateId: string; token: string }
    const { documentType, status, notes } = request.body as { documentType: string; status: string; notes?: string }

    if (!verifyToken(candidateId, token)) return reply.code(403).send({ error: 'Ungültiger Link' })
    if (!DOC_TYPES.includes(documentType as any)) return reply.code(400).send({ error: 'Ungültiger Dokumenttyp.' })
    if (!CHECKLIST_STATUSES.includes(status as any)) return reply.code(400).send({ error: 'Ungültiger Status.' })

    const existing = await fastify.prisma.documentChecklist.findUnique({
      where: { candidateId_documentType: { candidateId, documentType: documentType as any } },
    })

    if (existing) {
      await fastify.prisma.documentChecklist.update({
        where: { id: existing.id },
        data: { status: status as any, notes, receivedAt: status === 'received' ? new Date() : undefined },
      })
    } else {
      await fastify.prisma.documentChecklist.create({
        data: {
          candidateId,
          documentType: documentType as any,
          status:       status as any,
          notes,
          receivedAt:   status === 'received' ? new Date() : undefined,
        },
      })
    }

    return { success: true }
  })

  // ── POST /api/portal/:candidateId/:token/onboarding — Fragenkatalog ────
  fastify.post('/:candidateId/:token/onboarding', async (request, reply) => {
    const { candidateId, token } = request.params as { candidateId: string; token: string }
    if (!verifyToken(candidateId, token)) return reply.code(403).send({ error: 'Ungültiger Link' })

    const body = request.body as any
    const now  = new Date()

    // Geburtsdatum validieren (sonst: new Date(NaN) → Prisma-500)
    let dob: Date | undefined = undefined
    if (body.dateOfBirth) {
      const parsed = new Date(body.dateOfBirth)
      if (isNaN(parsed.getTime())) return reply.code(400).send({ error: 'Ungültiges Geburtsdatum.' })
      dob = parsed
    }

    // Alle gesammelten Daten in den Kandidaten schreiben
    await fastify.prisma.candidate.update({
      where: { id: candidateId },
      data: {
        // Persönliche Daten
        phone:            body.phone        || undefined,
        fullAddress:      body.fullAddress  || undefined,
        dateOfBirth:      dob,
        residencePermit:  body.residencePermit || undefined,
        deutschLevel:     body.deutschLevel || undefined,
        // Qualifikation (ergänzen wenn leer)
        educationLevel:   body.educationLevel || undefined,
        hasTranslationExp: body.hasTranslationExp !== undefined ? body.hasTranslationExp : undefined,
        translationYears: body.translationYears ? Number(body.translationYears) : undefined,
        // Onboarding abgeschlossen
        onboardingCompletedAt: now,
        notes: ((await fastify.prisma.candidate.findUnique({ where: { id: candidateId }, select: { notes: true } }))?.notes || '')
          + `\n\n[${now.toLocaleDateString('de-DE')} — Kandidaten-Onboarding abgeschlossen]
Aufenthaltstitel: ${body.residencePermit || 'nicht angegeben'}
Adresse: ${body.fullAddress || 'nicht angegeben'}
Geb.: ${body.dateOfBirth || 'nicht angegeben'}
Zusätzliche Angaben: ${body.additionalInfo || 'keine'}`,
      },
    })

    // Dokument-Checkliste anlegen/aktualisieren
    if (body.documentDeclarations) {
      for (const [docType, status] of Object.entries(body.documentDeclarations)) {
        const existing = await fastify.prisma.documentChecklist.findUnique({
          where: { candidateId_documentType: { candidateId, documentType: docType as any } },
        })
        const data = { status: status as any, requestedAt: now }
        if (existing) {
          await fastify.prisma.documentChecklist.update({ where: { id: existing.id }, data })
        } else {
          await fastify.prisma.documentChecklist.create({
            data: { candidateId, documentType: docType as any, ...data },
          })
        }
      }
    }

    // Task für Ramon
    const admin = await fastify.prisma.user.findFirst({ where: { role: 'admin' } })
    if (admin) {
      await fastify.prisma.task.create({
        data: {
          candidateId,
          assignedToId: admin.id,
          title:        `✅ Onboarding abgeschlossen: ${(await fastify.prisma.candidate.findUnique({ where: { id: candidateId }, select: { firstName: true, lastName: true } }))?.firstName} — Profil vollständig`,
          description:  'Kandidat hat Fragenkatalog ausgefüllt und Dokument-Status erklärt. Bitte Profil prüfen.',
          dueAt:        new Date(),
          priority:     'medium',
          isAutomated:  true,
          createdById:  admin.id,
        },
      })
    }

    return { success: true }
  })

  // ── POST /api/portal/:candidateId/:token/upload — Datei hochladen ────────
  fastify.post('/:candidateId/:token/upload', async (request, reply) => {
    const { candidateId, token } = request.params as { candidateId: string; token: string }
    if (!verifyToken(candidateId, token)) return reply.code(403).send({ error: 'Ungültiger Link' })

    const candidate = await fastify.prisma.candidate.findUnique({ where: { id: candidateId } })
    if (!candidate) return reply.code(404).send({ error: 'Nicht gefunden' })

    if (!storageConfigured()) return reply.code(503).send({ error: 'Dokument-Upload derzeit nicht verfügbar (Storage nicht konfiguriert).' })

    // Multipart File
    const data = await request.file()
    if (!data) return reply.code(400).send({ error: 'Keine Datei' })

    // Validierung VOR dem Upload (sonst: verwaiste Bucket-Datei + 500)
    const docType = (data.fields as any).docType?.value || 'other'
    if (!DOC_TYPES.includes(docType)) {
      return reply.code(400).send({ error: 'Ungültiger Dokumenttyp.' })
    }
    const ext = (extname(data.filename) || '.pdf').toLowerCase()
    if (!ALLOWED_EXT.includes(ext as any) || (data.mimetype && !ALLOWED_MIME.includes(data.mimetype as any))) {
      return reply.code(415).send({ error: 'Dateityp nicht erlaubt. Bitte PDF, Word, JPG oder PNG hochladen.' })
    }

    const filename   = `${docType}_${Date.now()}${ext}`
    const objectPath = `${candidateId}/${filename}` // Pfad im privaten Supabase-Bucket (EU/Frankfurt)

    const buffer = await data.toBuffer()

    const { error: upErr } = await uploadObject(objectPath, buffer, data.mimetype)
    if (upErr) {
      fastify.log.error({ err: upErr }, 'Supabase Storage upload failed')
      return reply.code(500).send({ error: 'Upload fehlgeschlagen' })
    }

    // Document-Eintrag in DB (storagePath = Bucket-Objektpfad)
    const doc = await fastify.prisma.document.create({
      data: {
        candidateId,
        documentType:  docType as any,
        displayName:   data.filename,
        storagePath:   objectPath,
        mimeType:      data.mimetype,
        fileSizeBytes: buffer.length,
      },
    })

    // Checklist aktualisieren
    const existing = await fastify.prisma.documentChecklist.findUnique({
      where: { candidateId_documentType: { candidateId, documentType: docType as any } },
    })
    const checkData = { status: 'received' as const, receivedAt: new Date() }
    if (existing) {
      await fastify.prisma.documentChecklist.update({ where: { id: existing.id }, data: checkData })
    } else {
      await fastify.prisma.documentChecklist.create({
        data: { candidateId, documentType: docType as any, ...checkData },
      })
    }

    return { success: true, documentId: doc.id, filename: doc.displayName }
  })

  // ── GET /api/portal/:candidateId/:token/file/:docId — Datei abrufen ─────
  fastify.get('/:candidateId/:token/file/:docId', async (request, reply) => {
    const { candidateId, token, docId } = request.params as any
    if (!verifyToken(candidateId, token)) return reply.code(403).send({ error: 'Ungültiger Link' })

    const doc = await fastify.prisma.document.findUnique({ where: { id: docId } })
    if (!doc || doc.candidateId !== candidateId) return reply.code(404).send({ error: 'Nicht gefunden' })

    if (!storageConfigured()) return reply.code(503).send({ error: 'Storage nicht konfiguriert' })

    const { url, error } = await createSignedUrl(doc.storagePath, 120) // kurzlebiger, signierter Link (2 Min.)
    if (error || !url) return reply.code(404).send({ error: 'Datei nicht gefunden' })

    return reply.redirect(url)
  })

  // ── POSTFACH ────────────────────────────────────────────────────────────

  // GET /api/portal/:candidateId/:token/messages — Postfach laden
  fastify.get('/:candidateId/:token/messages', async (request, reply) => {
    const { candidateId, token } = request.params as { candidateId: string; token: string }
    if (!verifyToken(candidateId, token)) return reply.code(403).send({ error: 'Ungültiger Link' })

    const messages = await fastify.prisma.portalMessage.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return {
      messages: messages.map(m => ({
        id:         m.id,
        direction:  m.direction,
        subject:    m.subject,
        body:       m.body,
        authorName: m.direction === 'outbound' ? (m.authorName || 'speak2') : null,
        readAt:     m.readAt,
        createdAt:  m.createdAt,
      })),
      // ungelesen = von speak2 gesendet, vom Kandidaten noch nicht geöffnet
      unreadCount: messages.filter(m => m.direction === 'outbound' && !m.readAt).length,
    }
  })

  // POST /api/portal/:candidateId/:token/messages — Kandidat schreibt uns
  fastify.post('/:candidateId/:token/messages', async (request, reply) => {
    const { candidateId, token } = request.params as { candidateId: string; token: string }
    const { body, subject } = request.body as { body?: string; subject?: string }

    if (!verifyToken(candidateId, token)) return reply.code(403).send({ error: 'Ungültiger Link' })

    const text = typeof body === 'string' ? body.trim() : ''
    if (!text) return reply.code(400).send({ error: 'Nachricht darf nicht leer sein' })
    if (text.length > 5000) return reply.code(400).send({ error: 'Nachricht zu lang (max. 5000 Zeichen)' })

    const candidate = await fastify.prisma.candidate.findUnique({ where: { id: candidateId } })
    if (!candidate) return reply.code(404).send({ error: 'Nicht gefunden' })

    const message = await fastify.prisma.portalMessage.create({
      data: {
        candidateId,
        direction:  'inbound',
        subject:    typeof subject === 'string' && subject.trim() ? subject.trim().slice(0, 200) : null,
        body:       text,
        authorName: `${candidate.firstName} ${candidate.lastName}`.trim(),
      },
    })

    // Aufgabe für das Team: eingehende Nachricht beantworten
    try {
      await fastify.prisma.task.create({
        data: {
          candidateId,
          title:       `📬 Postfach: Nachricht von ${candidate.firstName} ${candidate.lastName} beantworten`,
          description: text.slice(0, 500),
          priority:    'high',
          dueAt:       new Date(Date.now() + 2 * 86400000),
          isAutomated: true,
        },
      })
    } catch (e) {
      fastify.log.error({ err: e }, 'Postfach: Folgeaufgabe konnte nicht erstellt werden')
    }

    return { id: message.id, createdAt: message.createdAt }
  })

  // POST /api/portal/:candidateId/:token/messages/read — als gelesen markieren
  fastify.post('/:candidateId/:token/messages/read', async (request, reply) => {
    const { candidateId, token } = request.params as { candidateId: string; token: string }
    if (!verifyToken(candidateId, token)) return reply.code(403).send({ error: 'Ungültiger Link' })

    const { count } = await fastify.prisma.portalMessage.updateMany({
      where: { candidateId, direction: 'outbound', readAt: null },
      data:  { readAt: new Date() },
    })
    return { marked: count }
  })

  // ── Utility: Token für Kandidat generieren (intern, für E-Mails) ────────
  fastify.get('/token/:candidateId', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const { candidateId } = request.params as { candidateId: string }
    const token = makeToken(candidateId)
    const baseUrl = publicBaseUrl()
    return {
      token,
      portalUrl:    `${baseUrl}/portal/${candidateId}/${token}`,
      contractUrl:  `${baseUrl}/portal/${candidateId}/${token}#vertrag`,
      documentUrl:  `${baseUrl}/portal/${candidateId}/${token}#dokumente`,
    }
  })
}
