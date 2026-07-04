import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { Resend } from 'resend'
import Handlebars from 'handlebars'

const createDraftSchema = z.object({
  candidateId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  subject: z.string(),
  bodyHtml: z.string(),
  toAddresses: z.array(z.string().email()),
  ccAddresses: z.array(z.string().email()).default([]),
  channel: z.enum(['email', 'phone', 'letter', 'other']).default('email'),
})

const renderTemplateSchema = z.object({
  templateId: z.string().uuid(),
  candidateId: z.string().uuid(),
})

export const communicationRoutes: FastifyPluginAsync = async (fastify) => {
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

  // GET /api/communications?candidateId=...&status=...
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { candidateId, status } = request.query as { candidateId?: string; status?: string }
    return fastify.prisma.communication.findMany({
      where: {
        ...(candidateId ? { candidateId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, candidateRef: true } },
        createdBy: { select: { fullName: true } },
        approvedBy: { select: { fullName: true } },
        template: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  })

  // POST /api/communications/render — render template with candidate data
  fastify.post('/render', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { templateId, candidateId } = renderTemplateSchema.parse(request.body)

    const [template, candidate] = await Promise.all([
      fastify.prisma.emailTemplate.findUnique({ where: { id: templateId } }),
      fastify.prisma.candidate.findUnique({
        where: { id: candidateId },
        include: {
          bundesland: true,
          assignedTo: { select: { fullName: true, email: true } },
        },
      }),
    ])

    if (!template || !candidate) return reply.code(404).send({ error: 'Template or candidate not found' })

    const variables = {
      kandidat_name: `${candidate.firstName} ${candidate.lastName}`,
      sprache: candidate.nativeLanguage,
      sprachpaar: candidate.languagePair,
      bundesland: candidate.bundesland?.bundeslandName || '',
      gericht_name: candidate.bundesland?.courtName || candidate.targetCourt || '',
      gericht_adresse: candidate.bundesland?.courtAddress || '',
      kosten_min: candidate.bundesland?.typicalCostMin || '',
      kosten_max: candidate.bundesland?.typicalCostMax || '',
      rechtliche_grundlage: candidate.bundesland?.legalBasisCitation || '',
      ansprechpartner_name: candidate.assignedTo?.fullName || '',
      datum: new Date().toLocaleDateString('de-DE'),
      kandidat_email: candidate.email || '',
    }

    const compiledSubject = Handlebars.compile(template.subjectTmpl)(variables)
    const compiledBody = Handlebars.compile(template.bodyHtmlTmpl)(variables)

    return {
      subject: compiledSubject,
      bodyHtml: compiledBody,
      variables,
      unresolvedVariables: Object.entries(variables)
        .filter(([, v]) => v === '' || v === null || v === undefined)
        .map(([k]) => k),
    }
  })

  // POST /api/communications — create draft
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = createDraftSchema.parse(request.body)
    const user = (request as any).user

    const comm = await fastify.prisma.communication.create({
      data: {
        ...body,
        direction: 'outbound',
        status: 'draft',
        createdById: user.id,
        fromAddress: `${user.fullName} <noreply@speak2.de>`,
      },
    })

    return reply.code(201).send(comm)
  })

  // PATCH /api/communications/:id/submit — submit for approval
  fastify.patch('/:id/submit', { preHandler: [fastify.authenticate] }, async (request) => {
    const { id } = request.params as { id: string }
    return fastify.prisma.communication.update({
      where: { id },
      data: { status: 'pending_approval' },
    })
  })

  // PATCH /api/communications/:id/approve — approve and send
  fastify.patch('/:id/approve', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = (request as any).user

    const comm = await fastify.prisma.communication.findUnique({
      where: { id },
      include: { candidate: true },
    })
    if (!comm) return reply.code(404).send({ error: 'Communication not found' })

    // Idempotency guard: never re-send an already-sent communication.
    if (comm.status === 'sent') {
      return reply.code(409).send({ error: 'Diese Nachricht wurde bereits gesendet.' })
    }

    // For email channel we must actually send — no silent success.
    let resendId: string | undefined
    if (comm.channel === 'email') {
      if (!resend) {
        return reply.code(503).send({ error: 'E-Mail-Versand nicht konfiguriert (RESEND_API_KEY fehlt).' })
      }
      if (comm.toAddresses.length === 0) {
        return reply.code(400).send({ error: 'Keine Empfängeradresse hinterlegt.' })
      }
      try {
        const { data, error } = await resend.emails.send({
          from: `speak2 <info@speak2.de>`,
          to: comm.toAddresses,
          cc: comm.ccAddresses.length > 0 ? comm.ccAddresses : undefined,
          subject: comm.subject || '(Kein Betreff)',
          html: comm.bodyHtml || '',
        })
        if (error) throw error
        resendId = data?.id
      } catch (err) {
        fastify.log.error({ err }, 'Resend send failed')
        return reply.code(502).send({ error: 'E-Mail-Versand fehlgeschlagen' })
      }
    }

    // Only reached if the email actually sent (or channel is phone/letter = logged manually).
    const updated = await fastify.prisma.communication.update({
      where: { id },
      data: {
        status: 'sent',
        approvedById: user.id,
        approvedAt: new Date(),
        sentAt: new Date(),
        resendMessageId: resendId,
      },
    })

    return updated
  })

  // PATCH /api/communications/:id/reject — reject draft
  fastify.patch('/:id/reject', { preHandler: [fastify.authenticate] }, async (request) => {
    const { id } = request.params as { id: string }
    return fastify.prisma.communication.update({
      where: { id },
      data: { status: 'draft' },
    })
  })

  // GET /api/communications/templates — list all templates
  fastify.get('/templates', { preHandler: [fastify.authenticate] }, async () => {
    return fastify.prisma.emailTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
  })
}
