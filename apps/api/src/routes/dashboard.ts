import { FastifyPluginAsync } from 'fastify'

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/dashboard — full dashboard data
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const now = new Date()

    // Pipeline counts per status
    const pipelineCounts = await fastify.prisma.candidate.groupBy({
      by: ['status'],
      _count: { status: true },
    })

    // Urgent action candidates (overdue tasks or waiting_on_speak2 too long)
    const urgentCandidates = await fastify.prisma.candidate.findMany({
      where: {
        status: { notIn: ['dropped', 'certified'] },
        OR: [
          { waitingFor: 'speak2', updatedAt: { lt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) } },
          { tasks: { some: { status: 'pending', dueAt: { lt: now } } } },
        ],
      },
      include: {
        assignedTo: { select: { id: true, fullName: true } },
        tasks: { where: { status: 'pending', dueAt: { lt: now } }, orderBy: { dueAt: 'asc' }, take: 1 },
        bundesland: { select: { bundeslandName: true, difficulty: true } },
      },
      orderBy: { updatedAt: 'asc' },
      take: 10,
    })

    // Financial snapshot
    const investments = await fastify.prisma.financialRecord.aggregate({
      where: { recordType: 'investment' },
      _sum: { amountEur: true },
    })
    const revenue = await fastify.prisma.financialRecord.aggregate({
      where: { recordType: 'revenue' },
      _sum: { speak2ShareEur: true },
    })

    // Recent activity (last 20 events)
    const recentActivity = await fastify.prisma.pipelineEvent.findMany({
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, languagePair: true, candidateRef: true } },
        triggeredBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Pending approvals (emails awaiting approval)
    const pendingApprovals = await fastify.prisma.communication.findMany({
      where: { status: 'pending_approval' },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, candidateRef: true } },
        createdBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Overdue tasks
    const overdueTasks = await fastify.prisma.task.findMany({
      where: { status: 'pending', dueAt: { lt: now } },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, candidateRef: true } },
        assignedTo: { select: { fullName: true } },
      },
      orderBy: { dueAt: 'asc' },
      take: 10,
    })

    return {
      pipeline: pipelineCounts.reduce((acc: any, item) => {
        acc[item.status] = item._count.status
        return acc
      }, {}),
      urgentCandidates,
      financials: {
        totalInvested: Number(investments._sum.amountEur || 0),
        totalRevenue: Number(revenue._sum.speak2ShareEur || 0),
        netPosition: Number(revenue._sum.speak2ShareEur || 0) - Number(investments._sum.amountEur || 0),
      },
      recentActivity,
      pendingApprovals,
      overdueTasks,
    }
  })
}
