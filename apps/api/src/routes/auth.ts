import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createHash, randomBytes } from 'crypto'
import { Resend } from 'resend'
import { publicBaseUrl } from '../lib/urls'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

// Simple password hash for MVP (use bcrypt in production)
function hashPassword(password: string): string {
  return createHash('sha256').update(password + (process.env.PASSWORD_SALT || 'certmanager-salt')).digest('hex')
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

// Fallback: per-user password hash via env var (Alt-System, vor DB-Speicherung)
function envHashFor(email: string): string | undefined {
  const envKey = `USER_HASH_${email.replace(/[@.]/g, c => (c === '@' ? '_AT_' : '_DOT_'))}`
  return process.env[envKey]
}

const RESET_TTL_MS = 60 * 60 * 1000 // 1 Stunde

async function sendResetEmail(toEmail: string, fullName: string, resetUrl: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) return false
  const resend = new Resend(key)
  const from = process.env.MAIL_FROM || 'speak2 <info@speak2.de>'
  try {
    const { error } = await resend.emails.send({
      from,
      to: toEmail,
      subject: 'speak2 CertManager — Passwort zurücksetzen',
      html: `
        <div style="font-family:Arial,sans-serif;font-size:14px;color:#1e293b;line-height:1.6">
          <p>Hallo ${fullName || ''},</p>
          <p>Sie (oder jemand mit Ihrer E-Mail-Adresse) haben ein neues Passwort für den speak2 CertManager angefordert.
          Klicken Sie auf den folgenden Link, um ein neues Passwort zu vergeben. Der Link ist eine Stunde gültig:</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Neues Passwort vergeben</a></p>
          <p style="font-size:12px;color:#64748b">Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>${resetUrl}</p>
          <p style="font-size:12px;color:#64748b">Wenn Sie das nicht angefordert haben, ignorieren Sie diese E-Mail — Ihr Passwort bleibt unverändert.</p>
          <p style="font-size:12px;color:#64748b">speak2 CertManager</p>
        </div>`,
    })
    return !error
  } catch {
    return false
  }
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/auth/login
  fastify.post('/login', async (request, reply) => {
    const parsed = loginSchema.parse(request.body)
    const email = normalizeEmail(parsed.email)

    const user = await fastify.prisma.user.findUnique({ where: { email } })
    if (!user) {
      return reply.code(401).send({ error: 'Ungültige E-Mail oder Passwort' })
    }

    const passwordHash = hashPassword(parsed.password)

    // Passwort primär aus der DB prüfen; Fallback auf env-Hash (Alt-Nutzer ohne DB-Hash).
    const stored = user.passwordHash || envHashFor(email)
    if (!stored || passwordHash !== stored) {
      return reply.code(401).send({ error: 'Ungültige E-Mail oder Passwort' })
    }

    const token = fastify.jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
      { expiresIn: '8h' },
    )

    await fastify.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        // Gelegenheit zur stillen Migration: env-Hash in die DB übernehmen.
        ...(user.passwordHash ? {} : { passwordHash: stored }),
      },
    })

    return {
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    }
  })

  // POST /api/auth/forgot-password — Selbstbedienung: Reset-Link anfordern
  fastify.post('/forgot-password', async (request, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(request.body)
    const normalized = normalizeEmail(email)
    const user = await fastify.prisma.user.findUnique({ where: { email: normalized } })

    // Immer generische Antwort — keine Auskunft, ob die Adresse existiert (kein User-Enumeration).
    const generic = { ok: true, message: 'Falls ein Konto zu dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.' }

    if (!user) return generic

    const rawToken = randomBytes(32).toString('hex')
    await fastify.prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash: sha256(rawToken), resetTokenExpiresAt: new Date(Date.now() + RESET_TTL_MS) },
    })

    const baseUrl = publicBaseUrl()
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`
    const emailed = await sendResetEmail(user.email, user.fullName, resetUrl)

    if (!emailed) {
      // Kein E-Mail-Versand konfiguriert: Aufgabe für Admins anlegen, damit der Link
      // manuell weitergegeben werden kann (interne 2-Personen-Nutzung).
      try {
        await fastify.prisma.task.create({
          data: {
            title:       `🔑 Passwort-Reset-Link an ${user.fullName} weitergeben`,
            description: `${user.fullName} (${user.email}) hat einen Passwort-Reset angefordert. E-Mail-Versand ist nicht konfiguriert. Link (1 Std. gültig):\n${resetUrl}`,
            priority:    'high',
            dueAt:       new Date(Date.now() + 86400000),
            isAutomated: true,
          },
        })
      } catch (e) {
        fastify.log.error({ err: e }, 'Reset-Fallback-Aufgabe fehlgeschlagen')
      }
    }

    return generic
  })

  // POST /api/auth/reset-password — neues Passwort mit Token setzen
  fastify.post('/reset-password', async (request, reply) => {
    const parsed = z.object({
      token: z.string().min(10),
      password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
    }).safeParse(request.body)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Ungültige Eingabe'
      return reply.code(400).send({ error: msg })
    }
    const { token, password } = parsed.data

    const user = await fastify.prisma.user.findFirst({
      where: { resetTokenHash: sha256(token), resetTokenExpiresAt: { gt: new Date() } },
    })
    if (!user) {
      return reply.code(400).send({ error: 'Link ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.' })
    }

    await fastify.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(password), resetTokenHash: null, resetTokenExpiresAt: null },
    })

    return { ok: true, message: 'Passwort geändert. Sie können sich jetzt anmelden.' }
  })

  // GET /api/auth/me
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request) => {
    const user = (request as any).user
    return fastify.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, fullName: true, role: true, avatarUrl: true, lastLoginAt: true },
    })
  })

  // ── Admin: Team-Verwaltung / Zugänge ──────────────────────────────────────

  async function requireAdmin(request: any, reply: any): Promise<boolean> {
    const me = await fastify.prisma.user.findUnique({ where: { id: request.user.id } })
    if (!me || me.role !== 'admin') {
      reply.code(403).send({ error: 'Nur Administratoren' })
      return false
    }
    return true
  }

  // GET /api/auth/users — Nutzerliste (nur Admin)
  fastify.get('/users', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return
    const users = await fastify.prisma.user.findMany({
      orderBy: { fullName: 'asc' },
      select: { id: true, email: true, fullName: true, role: true, lastLoginAt: true, passwordHash: true },
    })
    return users.map(u => ({
      id: u.id, email: u.email, fullName: u.fullName, role: u.role,
      lastLoginAt: u.lastLoginAt,
      hasPassword: !!u.passwordHash || !!envHashFor(u.email),
    }))
  })

  // POST /api/auth/users — Admin legt einen neuen Zugang an
  //
  // Bisher entstanden Nutzer ausschließlich im Seed oder per Einmal-Skript in
  // prisma/ (add-marushka.ts & Co.) — jeder neue Kollege war damit ein Deploy.
  // Der Zugang wird ohne Passwort angelegt; die Person vergibt es selbst über
  // den zurückgegebenen Reset-Link (gleiche 1-Stunden-TTL wie /reset-link).
  fastify.post('/users', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return

    const parsed = z.object({
      email:    z.string().email('Bitte eine gültige E-Mail-Adresse angeben'),
      fullName: z.string().trim().min(1, 'Name darf nicht leer sein').max(120),
      role:     z.enum(['staff', 'admin']).default('staff'),
    }).safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message || 'Ungültige Eingabe' })
    }
    const email = normalizeEmail(parsed.data.email)

    const existing = await fastify.prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.code(409).send({ error: `Es gibt bereits einen Zugang für ${email}.` })
    }

    const rawToken = randomBytes(32).toString('hex')
    const user = await fastify.prisma.user.create({
      data: {
        email,
        fullName:            parsed.data.fullName.trim(),
        role:                parsed.data.role,
        resetTokenHash:      sha256(rawToken),
        resetTokenExpiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    })

    const baseUrl = publicBaseUrl()
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`

    // Wenn E-Mail-Versand konfiguriert ist, bekommt die Person den Link direkt;
    // sonst gibt ihn der Admin aus der Antwort weiter (interne Kleinstnutzung).
    const emailed = await sendResetEmail(user.email, user.fullName, resetUrl)

    return reply.code(201).send({
      id:       user.id,
      email:    user.email,
      fullName: user.fullName,
      role:     user.role,
      emailed,
      resetUrl,
      expiresInMinutes: RESET_TTL_MS / 60000,
    })
  })

  // POST /api/auth/users/:id/reset-link — Admin erzeugt Reset-Link zum Weitergeben
  fastify.post('/users/:id/reset-link', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return
    const { id } = request.params as { id: string }
    const user = await fastify.prisma.user.findUnique({ where: { id } })
    if (!user) return reply.code(404).send({ error: 'Nutzer nicht gefunden' })

    const rawToken = randomBytes(32).toString('hex')
    await fastify.prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash: sha256(rawToken), resetTokenExpiresAt: new Date(Date.now() + RESET_TTL_MS) },
    })
    const baseUrl = publicBaseUrl()
    return {
      resetUrl: `${baseUrl}/reset-password?token=${rawToken}`,
      expiresInMinutes: RESET_TTL_MS / 60000,
      email: user.email,
      fullName: user.fullName,
    }
  })

  // POST /api/auth/users/:id/set-password — Admin setzt direkt ein Passwort
  fastify.post('/users/:id/set-password', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return
    const { id } = request.params as { id: string }
    const parsed = z.object({ password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben') }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message || 'Ungültige Eingabe' })
    const { password } = parsed.data
    const user = await fastify.prisma.user.findUnique({ where: { id } })
    if (!user) return reply.code(404).send({ error: 'Nutzer nicht gefunden' })

    await fastify.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(password), resetTokenHash: null, resetTokenExpiresAt: null },
    })
    return { ok: true }
  })
}
