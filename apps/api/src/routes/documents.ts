import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createSignedUrl } from '../lib/storage'

const documentMetaSchema = z.object({
  candidateId: z.string().uuid(),
  documentType: z.enum([
    'cv', 'contract_unsigned', 'contract_signed', 'apostille',
    'language_certificate', 'legal_language_cert', 'sample_translation',
    'embassy_letter', 'court_application', 'court_correspondence', 'other',
  ]),
  displayName: z.string(),
  storagePath: z.string(),
  mimeType: z.string().optional(),
  fileSizeBytes: z.number().int().optional(),
  notes: z.string().optional(),
})

export const documentRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/documents?candidateId=...
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { candidateId } = request.query as { candidateId?: string }
    return fastify.prisma.document.findMany({
      where: candidateId ? { candidateId } : {},
      include: { uploadedBy: { select: { fullName: true } } },
      orderBy: { uploadedAt: 'desc' },
    })
  })

  // GET /api/documents/:id/download — staff: short-lived signed URL to view/download a candidate file
  fastify.get('/:id/download', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const doc = await fastify.prisma.document.findUnique({ where: { id } })
    if (!doc) return reply.code(404).send({ error: 'Dokument nicht gefunden' })
    const { url, error } = await createSignedUrl(doc.storagePath, 300) // 5 Minuten gültig
    if (error || !url) return reply.code(404).send({ error: 'Datei nicht verfügbar' })
    return { url, displayName: doc.displayName }
  })

  // POST /api/documents — save document metadata after upload
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = documentMetaSchema.parse(request.body)
    const user = (request as any).user

    const document = await fastify.prisma.document.create({
      data: { ...body, uploadedById: user.id },
    })

    // Update checklist status if this type is in the checklist
    await fastify.prisma.documentChecklist.updateMany({
      where: { candidateId: body.candidateId, documentType: body.documentType as any },
      data: { status: 'received', receivedAt: new Date() },
    })

    return reply.code(201).send(document)
  })

  // DELETE /api/documents/:id
  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await fastify.prisma.document.delete({ where: { id } })
    return reply.code(204).send()
  })

  // GET /api/documents/checklist/:candidateId
  fastify.get('/checklist/:candidateId', { preHandler: [fastify.authenticate] }, async (request) => {
    const { candidateId } = request.params as { candidateId: string }
    return fastify.prisma.documentChecklist.findMany({
      where: { candidateId },
      orderBy: { documentType: 'asc' },
    })
  })

  // PATCH /api/documents/checklist/:id — update checklist item status
  fastify.patch('/checklist/:id', { preHandler: [fastify.authenticate] }, async (request) => {
    const { id } = request.params as { id: string }
    const { status, notes } = request.body as { status: string; notes?: string }
    return fastify.prisma.documentChecklist.update({
      where: { id },
      data: { status: status as any, notes },
    })
  })
}
