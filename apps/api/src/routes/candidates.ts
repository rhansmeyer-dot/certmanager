import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { CandidateStatus, WaitingFor } from '@prisma/client'

const createCandidateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  nativeLanguage: z.string().min(1),
  languagePair: z.string().min(1),
  countryOfOrigin: z.string().optional(),
  currentCity: z.string().optional(),
  bundeslandId: z.string().uuid().optional(),
  deutschLevel: z.string().optional(),
  educationLevel: z.string().optional(),
  hasTranslationExp: z.boolean().default(false),
  translationYears: z.number().int().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  assignedToId: z.string().uuid().optional(),
})

const updateStatusSchema = z.object({
  status: z.nativeEnum(CandidateStatus),
  notes: z.string().optional(),
})

const updateCandidateSchema = createCandidateSchema.partial().extend({
  waitingFor: z.nativeEnum(WaitingFor).optional(),
  notes: z.string().optional(),
  automationPaused: z.boolean().optional(),
  automationPausedUntil: z.string().datetime().optional(),
})

// Generate candidate reference: SP-2026-001
async function generateCandidateRef(prisma: any): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.candidate.count()
  return `SP-${year}-${String(count + 1).padStart(3, '0')}`
}

export const candidateRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/candidates — list all with filters
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { status, bundeslandId, assignedToId, language, overdue } = request.query as any

    const where: any = {}
    if (status) where.status = status
    if (bundeslandId) where.bundeslandId = bundeslandId
    if (assignedToId) where.assignedToId = assignedToId
    if (language) {
      where.OR = [
        { nativeLanguage: { contains: language, mode: 'insensitive' } },
        { languagePair: { contains: language, mode: 'insensitive' } },
      ]
    }

    const candidates = await fastify.prisma.candidate.findMany({
      where,
      include: {
        bundesland: true,
        assignedTo: { select: { id: true, fullName: true, email: true } },
        tasks: { where: { status: 'pending', dueAt: { lte: new Date() } }, orderBy: { dueAt: 'asc' }, take: 1 },
        documentChecklist: true,
        contracts: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { documents: true, communications: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return candidates
  })

  // GET /api/candidates/:id — single candidate with full detail
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const candidate = await fastify.prisma.candidate.findUnique({
      where: { id },
      include: {
        bundesland: {
          include: { documentRequirements: true },
        },
        assignedTo: { select: { id: true, fullName: true, email: true } },
        pipelineEvents: {
          include: { triggeredBy: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          include: { uploadedBy: { select: { id: true, fullName: true } } },
          orderBy: { uploadedAt: 'desc' },
        },
        documentChecklist: true,
        communications: {
          include: {
            createdBy: { select: { id: true, fullName: true } },
            approvedBy: { select: { id: true, fullName: true } },
            template: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          include: {
            assignedTo: { select: { id: true, fullName: true } },
            completedBy: { select: { id: true, fullName: true } },
          },
          orderBy: { dueAt: 'asc' },
        },
        financialRecords: { orderBy: { occurredAt: 'desc' } },
        contracts: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!candidate) return reply.code(404).send({ error: 'Candidate not found' })
    return candidate
  })

  // POST /api/candidates — create new candidate
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const body = createCandidateSchema.parse(request.body)
    const user = (request as any).user

    const candidateRef = await generateCandidateRef(fastify.prisma)

    const candidate = await fastify.prisma.candidate.create({
      data: {
        ...body,
        candidateRef,
        assignedToId: body.assignedToId || user.id,
      },
    })

    // Create pipeline event
    await fastify.prisma.pipelineEvent.create({
      data: {
        candidateId: candidate.id,
        toStatus: 'identified',
        triggeredById: user.id,
        notes: 'Kandidat angelegt',
      },
    })

    // If bundesland is set, auto-generate document checklist
    if (body.bundeslandId) {
      const requirements = await fastify.prisma.documentRequirement.findMany({
        where: { bundeslandId: body.bundeslandId },
      })
      if (requirements.length > 0) {
        await fastify.prisma.documentChecklist.createMany({
          data: requirements.map((req) => ({
            candidateId: candidate.id,
            documentType: req.documentType,
            status: req.isMandatory ? 'missing_critical' : 'not_required',
          })),
          skipDuplicates: true,
        })
      }
    }

    return reply.code(201).send(candidate)
  })

  // PATCH /api/candidates/:id — update candidate
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = updateCandidateSchema.parse(request.body)

    const candidate = await fastify.prisma.candidate.update({
      where: { id },
      data: body,
    })

    return candidate
  })

  // PATCH /api/candidates/:id/status — update pipeline status
  fastify.patch('/:id/status', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { status, notes } = updateStatusSchema.parse(request.body)
    const user = (request as any).user

    const current = await fastify.prisma.candidate.findUnique({
      where: { id },
      select: { status: true },
    })
    if (!current) return reply.code(404).send({ error: 'Candidate not found' })

    // Build timestamp updates based on new status
    const timestampUpdate: Record<string, Date> = {}
    const now = new Date()
    const statusTimestamps: Partial<Record<CandidateStatus, string>> = {
      analyzed: 'analyzedAt',
      outline_sent: 'outlineSentAt',
      contract_sent: 'contractSentAt',
      contract_signed: 'contractSignedAt',
      certification_in_progress: 'certificationStartedAt',
      certified: 'certifiedAt',
      dropped: 'droppedAt',
    }
    const tsField = statusTimestamps[status]
    if (tsField) timestampUpdate[tsField] = now

    // Determine new waitingFor based on status
    const waitingForMap: Partial<Record<CandidateStatus, WaitingFor>> = {
      identified: 'speak2',
      analyzed: 'speak2',
      outline_sent: 'candidate',
      contract_sent: 'candidate',
      contract_signed: 'speak2',
      certification_in_progress: 'court',
      certified: 'speak2',
      dropped: 'speak2',
    }

    const [candidate] = await fastify.prisma.$transaction([
      fastify.prisma.candidate.update({
        where: { id },
        data: {
          status,
          waitingFor: waitingForMap[status] || 'speak2',
          ...timestampUpdate,
        },
      }),
      fastify.prisma.pipelineEvent.create({
        data: {
          candidateId: id,
          fromStatus: current.status,
          toStatus: status,
          triggeredById: user.id,
          notes,
        },
      }),
    ])

    // Auto-create follow-up tasks based on new status
    await createAutoTasks(fastify.prisma, id, status, user.id)

    return candidate
  })

  // GET /api/candidates/:id/priority — calculate priority score
  fastify.get('/:id/priority', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string }
    const candidate = await fastify.prisma.candidate.findUnique({
      where: { id },
      include: {
        tasks: { where: { status: 'pending' } },
        financialRecords: true,
      },
    })
    if (!candidate) return { score: 0, tier: 'low' }

    return calculatePriorityScore(candidate)
  })
}

// Auto-create tasks when status changes
async function createAutoTasks(prisma: any, candidateId: string, status: CandidateStatus, userId: string) {
  const now = new Date()
  const tasks: any[] = []

  const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000)

  switch (status) {
    case 'outline_sent':
      tasks.push(
        { title: 'Nachfassung Outline #1', dueAt: addDays(now, 5), isAutomated: true, priority: 'medium' },
        { title: 'Nachfassung Outline #2 (persönlich)', dueAt: addDays(now, 10), isAutomated: true, priority: 'high' },
        { title: 'Anruf wenn keine Reaktion', dueAt: addDays(now, 15), isAutomated: true, priority: 'urgent' },
      )
      break
    case 'contract_sent':
      tasks.push(
        { title: 'Nachfassung Vertrag #1', dueAt: addDays(now, 5), isAutomated: true, priority: 'medium' },
        { title: 'Nachfassung Vertrag #2 (eskaliert)', dueAt: addDays(now, 10), isAutomated: true, priority: 'high' },
        { title: 'Eskalation: Vertrag noch nicht unterzeichnet', dueAt: addDays(now, 21), isAutomated: true, priority: 'urgent' },
      )
      break
    case 'certification_in_progress':
      tasks.push(
        { title: 'Gerichtsstatus prüfen', dueAt: addDays(now, 28), isAutomated: true, priority: 'medium' },
        { title: 'Gericht nachfassen (4 Wochen)', dueAt: addDays(now, 56), isAutomated: true, priority: 'high' },
        { title: 'Eskalation: Gerichtsantwort überfällig', dueAt: addDays(now, 84), isAutomated: true, priority: 'urgent' },
      )
      break
    case 'certified':
      tasks.push(
        { title: '30-Tage Check-in: Ersten Auftrag erhalten?', dueAt: addDays(now, 30), isAutomated: true, priority: 'medium' },
        { title: 'ROI-Check: Kein Revenue nach 60 Tagen', dueAt: addDays(now, 60), isAutomated: true, priority: 'high' },
      )
      break
  }

  if (tasks.length > 0) {
    await prisma.task.createMany({
      data: tasks.map((t) => ({ ...t, candidateId, assignedToId: userId })),
    })
  }
}

// Priority scoring algorithm
function calculatePriorityScore(candidate: any) {
  let score = 0

  // 1. Overdue action (30 pts max)
  const overdueTasks = candidate.tasks.filter((t: any) => new Date(t.dueAt) < new Date())
  const overdueDays = overdueTasks.length > 0
    ? Math.floor((new Date().getTime() - new Date(overdueTasks[0].dueAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0
  score += Math.min(overdueDays * 5, 30)

  // 2. Total investment (20 pts max)
  const invested = candidate.financialRecords
    .filter((r: any) => r.recordType === 'investment')
    .reduce((sum: number, r: any) => sum + Number(r.amountEur), 0)
  score += Math.min((invested / 2500) * 20, 20)

  // 3. Waiting for speak2 (urgent)
  if (candidate.waitingFor === 'speak2') score += 20

  const tier = score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low'
  return { score: Math.min(score, 100), tier }
}
