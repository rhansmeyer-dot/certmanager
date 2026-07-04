import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const createTaskSchema = z.object({
  candidateId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  dueAt: z.string().datetime(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assignedToId: z.string().uuid().optional(),
})

export const taskRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { candidateId, status, assignedToId, overdue } = request.query as any
    const now = new Date()
    return fastify.prisma.task.findMany({
      where: {
        ...(candidateId ? { candidateId } : {}),
        ...(assignedToId ? { assignedToId } : {}),
        ...(overdue === 'true'
          ? { dueAt: { lt: now }, status: 'pending' }
          : status
            ? { status }
            // Default: hide done + cancelled; also hide snoozed until the snooze expires.
            : { status: { notIn: ['done', 'cancelled'] }, NOT: { AND: [{ status: 'snoozed' }, { snoozeUntil: { gt: now } }] } }),
      },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, candidateRef: true } },
        assignedTo: { select: { fullName: true } },
      },
      orderBy: { dueAt: 'asc' },
    })
  })

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = createTaskSchema.parse(request.body)
    const user = (request as any).user
    const task = await fastify.prisma.task.create({
      data: { ...body, createdById: user.id, assignedToId: body.assignedToId || user.id },
    })
    return reply.code(201).send(task)
  })

  fastify.patch('/:id/complete', { preHandler: [fastify.authenticate] }, async (request) => {
    const { id } = request.params as { id: string }
    const user = (request as any).user
    return fastify.prisma.task.update({
      where: { id },
      data: { status: 'done', completedAt: new Date(), completedById: user.id },
    })
  })

  fastify.patch('/:id/snooze', { preHandler: [fastify.authenticate] }, async (request) => {
    const { id } = request.params as { id: string }
    const { days } = request.body as { days: number }
    const snoozeUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    return fastify.prisma.task.update({
      where: { id },
      data: { status: 'snoozed', snoozeUntil },
    })
  })

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await fastify.prisma.task.update({ where: { id }, data: { status: 'cancelled' } })
    return reply.code(204).send()
  })
}
