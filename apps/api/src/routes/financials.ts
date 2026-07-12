import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const createRecordSchema = z.object({
  candidateId: z.string().uuid(),
  recordType: z.enum(['investment', 'revenue']),
  category: z.string().min(1),
  amountEur: z.number().positive(),
  speak2ShareEur: z.number().positive().optional(),
  description: z.string().optional(),
  invoiceRef: z.string().optional(),
  occurredAt: z.string().datetime(),
})

export const financialRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { candidateId } = request.query as { candidateId?: string }
    return fastify.prisma.financialRecord.findMany({
      where: candidateId ? { candidateId } : {},
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, candidateRef: true } },
        recordedBy: { select: { fullName: true } },
      },
      orderBy: { occurredAt: 'desc' },
    })
  })

  // GET /api/financials/summary — portfolio overview
  fastify.get('/summary', { preHandler: [fastify.authenticate] }, async () => {
    const [investments, revenue, byCandidateInv, byCandidateRev] = await Promise.all([
      fastify.prisma.financialRecord.aggregate({
        where: { recordType: 'investment' },
        _sum: { amountEur: true },
      }),
      fastify.prisma.financialRecord.aggregate({
        where: { recordType: 'revenue' },
        _sum: { speak2ShareEur: true },
      }),
      fastify.prisma.financialRecord.groupBy({
        by: ['candidateId'],
        where: { recordType: 'investment' },
        _sum: { amountEur: true },
      }),
      fastify.prisma.financialRecord.groupBy({
        by: ['candidateId'],
        where: { recordType: 'revenue' },
        _sum: { speak2ShareEur: true },
      }),
    ])

    const totalInvested = Number(investments._sum.amountEur || 0)
    const totalRevenue = Number(revenue._sum.speak2ShareEur || 0)

    return {
      totalInvested,
      totalRevenue,
      netPosition: totalRevenue - totalInvested,
      // Union of both sets so candidates with revenue but no investment aren't dropped.
      byCandidate: Array.from(new Set([
        ...byCandidateInv.map((i) => i.candidateId),
        ...byCandidateRev.map((r) => r.candidateId),
      ])).map((candidateId) => {
        const inv = byCandidateInv.find((i) => i.candidateId === candidateId)
        const rev = byCandidateRev.find((r) => r.candidateId === candidateId)
        const invested = Number(inv?._sum.amountEur || 0)
        const earned = Number(rev?._sum.speak2ShareEur || 0)
        return { candidateId, invested, earned, netPosition: earned - invested }
      }),
    }
  })

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = createRecordSchema.parse(request.body)
    const user = (request as any).user

    // Auto-calculate speak2 share for revenue if not provided
    let speak2ShareEur = body.speak2ShareEur
    if (body.recordType === 'revenue' && !speak2ShareEur) {
      speak2ShareEur = body.amountEur * 0.25 // default 25%
    }

    const record = await fastify.prisma.financialRecord.create({
      data: { ...body, speak2ShareEur, recordedById: user.id },
    })
    return reply.code(201).send(record)
  })

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await fastify.prisma.financialRecord.delete({ where: { id } })
    return reply.code(204).send()
  })
}
