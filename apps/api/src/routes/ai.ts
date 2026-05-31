import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { CandidateStatus, WaitingFor } from '@prisma/client'

// AI-Updates werden als Tasks mit Prefix [AI-UPDATE] gespeichert
// → kein Schema-Change nötig, Ramon verarbeitet sie im Claude-Chat
const AI_UPDATE_PREFIX = '[AI-UPDATE]'

const aiUpdateSchema = z.object({
  message: z.string().min(1).max(2000),
})

const aiConfirmSchema = z.object({
  originalMessage:    z.string(),
  taskId:             z.string().optional(), // Queue-Task zum Abschließen
  proposedStatus:     z.nativeEnum(CandidateStatus).nullable().optional(),
  proposedWaitingFor: z.nativeEnum(WaitingFor).nullable().optional(),
  noteToAdd:          z.string().nullable().optional(),
  taskTitle:          z.string().nullable().optional(),
  taskDescription:    z.string().nullable().optional(),
  taskDueDays:        z.number().nullable().optional(),
})

const STATUS_INFO: Record<string, string> = {
  identified:               'Kandidat identifiziert, noch keine Analyse',
  analyzed:                 'Analyse abgeschlossen, noch kein Kontakt aufgenommen',
  outline_sent:             'Outline/Konditionen an Kandidaten geschickt',
  contract_sent:            'Kooperationsvertrag verschickt, warten auf Unterschrift',
  contract_signed:          'Vertrag unterschrieben ✅',
  certification_in_progress:'Antrag beim Gericht eingereicht — läuft',
  certified:                'Ermächtigung erteilt ✅ — Prozess abgeschlossen',
  dropped:                  'Kandidat wird nicht mehr verfolgt',
}

const WAITING_INFO: Record<string, string> = {
  speak2:    'speak2 muss als nächstes handeln',
  candidate: 'Wir warten auf den Kandidaten',
  court:     'Wir warten auf das Gericht/die Behörde',
}

export const aiRoutes: FastifyPluginAsync = async (fastify) => {

  // ── POST /api/ai/candidates/:id/update ─────────────────────────────────
  // Speichert das Update als Task (Queue) — Ramon verarbeitet es im Claude-Chat
  fastify.post('/candidates/:id/update', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { message } = aiUpdateSchema.parse(request.body)

    const candidate = await fastify.prisma.candidate.findUnique({ where: { id } })
    if (!candidate) return reply.code(404).send({ error: 'Kandidat nicht gefunden' })

    const user = (request as any).user

    // Als speziellen Task speichern — kein AI-Call nötig
    await fastify.prisma.task.create({
      data: {
        candidateId:  id,
        title:        `${AI_UPDATE_PREFIX} ${user.fullName}: ${message.slice(0, 120)}`,
        description:  JSON.stringify({
          fullMessage: message,
          authorName:  user.fullName,
          authorId:    user.id,
          candidateRef: candidate.candidateRef,
          candidateName: `${candidate.firstName} ${candidate.lastName}`,
          status:       candidate.status,
          waitingFor:   candidate.waitingFor,
          queuedAt:     new Date().toISOString(),
        }),
        dueAt:        new Date(), // sofort fällig = sichtbar in Queue
        priority:     'high',
        isAutomated:  false,
        createdById:  user.id,
      },
    })

    return {
      queued: true,
      message: 'Update eingereicht ✓ — wird beim nächsten Chat-Besuch von Ramón verarbeitet',
    }
  })

  // ── GET /api/ai/queue ────────────────────────────────────────────────────
  // Alle offenen AI-Updates — für Ramon im Chat abrufbar
  fastify.get('/queue', {
    preHandler: [fastify.authenticate],
  }, async () => {
    const tasks = await fastify.prisma.task.findMany({
      where: {
        title:  { startsWith: AI_UPDATE_PREFIX },
        status: 'pending',
      },
      include: {
        candidate: {
          select: {
            id: true, candidateRef: true, firstName: true, lastName: true,
            languagePair: true, status: true, waitingFor: true,
            bundesland: { select: { bundeslandName: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return tasks.map(t => {
      let parsed: any = {}
      try { parsed = JSON.parse(t.description ?? '{}') } catch {}
      return {
        taskId:        t.id,
        candidateId:   t.candidateId,
        candidate:     t.candidate,
        message:       parsed.fullMessage ?? t.title.replace(AI_UPDATE_PREFIX, '').trim(),
        authorName:    parsed.authorName ?? '',
        queuedAt:      parsed.queuedAt ?? t.createdAt,
      }
    })
  })

  // ── POST /api/ai/candidates/:id/confirm ────────────────────────────────
  // Wendet die bestätigten Änderungen an + schließt den Queue-Task
  fastify.post('/candidates/:id/confirm', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = aiConfirmSchema.parse(request.body)
    const user = (request as any).user
    const now  = new Date()

    const candidate = await fastify.prisma.candidate.findUnique({ where: { id } })
    if (!candidate) return reply.code(404).send({ error: 'Kandidat nicht gefunden' })

    const updates: Record<string, any> = {}

    // ── Status-Änderung ────────────────────────────────────────────────
    if (body.proposedStatus && body.proposedStatus !== candidate.status) {
      updates.status = body.proposedStatus

      const tsMap: Partial<Record<CandidateStatus, string>> = {
        analyzed:                 'analyzedAt',
        outline_sent:             'outlineSentAt',
        contract_sent:            'contractSentAt',
        contract_signed:          'contractSignedAt',
        certification_in_progress:'certificationStartedAt',
        certified:                'certifiedAt',
        dropped:                  'droppedAt',
      }
      const tsField = tsMap[body.proposedStatus]
      if (tsField) updates[tsField] = now

      await fastify.prisma.pipelineEvent.create({
        data: {
          candidateId:   id,
          fromStatus:    candidate.status,
          toStatus:      body.proposedStatus,
          triggeredById: user.id,
          isAutomated:   false,
          notes:         `KI-Update: "${body.originalMessage.slice(0, 300)}"`,
        },
      })
    }

    // ── WaitingFor-Änderung ────────────────────────────────────────────
    if (body.proposedWaitingFor && body.proposedWaitingFor !== candidate.waitingFor) {
      updates.waitingFor = body.proposedWaitingFor
    }

    // ── Notiz anhängen ─────────────────────────────────────────────────
    if (body.noteToAdd) {
      const dateStr = now.toLocaleDateString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
      const stamp = `\n\n[${dateStr} — ${user.fullName}]: ${body.noteToAdd}`
      updates.notes = ((candidate.notes ?? '') + stamp).trim()
    }

    if (Object.keys(updates).length > 0) {
      await fastify.prisma.candidate.update({ where: { id }, data: updates })
    }

    // ── Task erstellen ─────────────────────────────────────────────────
    if (body.taskTitle) {
      const dueAt = new Date()
      dueAt.setDate(dueAt.getDate() + (body.taskDueDays ?? 7))
      await fastify.prisma.task.create({
        data: {
          candidateId:  id,
          title:        body.taskTitle,
          description:  body.taskDescription ?? undefined,
          dueAt,
          priority:     'medium',
          isAutomated:  true,
          createdById:  user.id,
        },
      })
    }

    // ── Queue-Task als erledigt markieren ─────────────────────────────
    if (body.taskId) {
      await fastify.prisma.task.update({
        where: { id: body.taskId },
        data:  { status: 'done', completedAt: now, completedById: user.id },
      })
    }

    return { success: true }
  })
}
