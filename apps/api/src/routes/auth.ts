import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createHash } from 'crypto'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

// Simple password hash for MVP (use bcrypt in production)
function hashPassword(password: string): string {
  return createHash('sha256').update(password + (process.env.PASSWORD_SALT || 'certmanager-salt')).digest('hex')
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/auth/login
  fastify.post('/login', async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body)

    const user = await fastify.prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return reply.code(401).send({ error: 'Ungültige E-Mail oder Passwort' })
    }

    // For MVP: check password hash stored in a separate table or env
    // In production: use bcrypt
    const passwordHash = hashPassword(password)

    // Per-user password hash via env var. No universal fallback: if a user has
    // no configured hash, login is denied (previously fell back to "admin123").
    const envKey = `USER_HASH_${email.replace(/[@.]/g, c => c === '@' ? '_AT_' : '_DOT_')}`
    const storedHash = process.env[envKey]

    if (!storedHash || passwordHash !== storedHash) {
      return reply.code(401).send({ error: 'Ungültige E-Mail oder Passwort' })
    }

    const token = fastify.jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
      { expiresIn: '8h' },
    )

    // Update last login
    await fastify.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    }
  })

  // GET /api/auth/me
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const user = (request as any).user
    const dbUser = await fastify.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, fullName: true, role: true, avatarUrl: true, lastLoginAt: true },
    })
    return dbUser
  })
}
