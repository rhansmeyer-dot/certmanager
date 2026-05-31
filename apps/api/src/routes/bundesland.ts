import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const bundeslandSchema = z.object({
  bundeslandCode: z.string().length(2),
  bundeslandName: z.string(),
  certificationName: z.string(),
  difficulty: z.enum(['easy', 'medium', 'complex']).default('medium'),
  hasExceptionRule: z.boolean().default(false),
  responsibleAuthority: z.string(),
  courtName: z.string().optional(),
  courtAddress: z.string().optional(),
  courtContact: z.string().optional(),
  legalBasisCitation: z.string().optional(),
  applicationProcess: z.string().optional(),
  estimatedDurationDays: z.number().int().optional(),
  typicalCostMin: z.number().int().optional(),
  typicalCostMax: z.number().int().optional(),
  specialNotes: z.string().optional(),
  ruleConfig: z.record(z.any()).optional(),
})

export const bundeslandRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async () => {
    return fastify.prisma.bundeslandRule.findMany({
      include: {
        documentRequirements: true,
        _count: { select: { candidates: true } },
      },
      orderBy: { bundeslandName: 'asc' },
    })
  })

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const rule = await fastify.prisma.bundeslandRule.findUnique({
      where: { id },
      include: {
        documentRequirements: true,
        candidates: {
          select: { id: true, firstName: true, lastName: true, status: true, languagePair: true, candidateRef: true },
        },
      },
    })
    if (!rule) return reply.code(404).send({ error: 'Bundesland rule not found' })
    return rule
  })

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = bundeslandSchema.parse(request.body)
    const user = (request as any).user
    const rule = await fastify.prisma.bundeslandRule.create({
      data: { ...body, updatedById: user.id },
    })
    return reply.code(201).send(rule)
  })

  fastify.patch('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = bundeslandSchema.partial().parse(request.body)
    const user = (request as any).user
    const rule = await fastify.prisma.bundeslandRule.update({
      where: { id },
      data: { ...body, lastUpdatedAt: new Date(), updatedById: user.id },
    })
    return rule
  })
}
