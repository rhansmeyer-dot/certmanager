import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'

import { prismaPlugin } from './plugins/prisma'
import { candidateRoutes } from './routes/candidates'
import { authRoutes } from './routes/auth'
import { bundeslandRoutes } from './routes/bundesland'
import { documentRoutes } from './routes/documents'
import { communicationRoutes } from './routes/communications'
import { taskRoutes } from './routes/tasks'
import { financialRoutes } from './routes/financials'
import { dashboardRoutes } from './routes/dashboard'
import { aiRoutes } from './routes/ai'
import { intakeRoutes } from './routes/intake'
import { portalRoutes } from './routes/portal'
import { antonRoutes } from './routes/anton'

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
})

async function start() {
  // Plugins
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map(s => s.trim())

  await server.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return cb(null, true)
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        return cb(null, true)
      }
      cb(new Error('Not allowed by CORS'), false)
    },
    credentials: true,
  })

  await server.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  })

  await server.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } }) // 20MB max
  await server.register(prismaPlugin)

  // Auth decorator
  server.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })

  // Routes
  await server.register(authRoutes, { prefix: '/api/auth' })
  await server.register(candidateRoutes, { prefix: '/api/candidates' })
  await server.register(bundeslandRoutes, { prefix: '/api/bundesland' })
  await server.register(documentRoutes, { prefix: '/api/documents' })
  await server.register(communicationRoutes, { prefix: '/api/communications' })
  await server.register(taskRoutes, { prefix: '/api/tasks' })
  await server.register(financialRoutes, { prefix: '/api/financials' })
  await server.register(dashboardRoutes, { prefix: '/api/dashboard' })
  await server.register(aiRoutes, { prefix: '/api/ai' })
  await server.register(intakeRoutes, { prefix: '/api/intake' })
  await server.register(portalRoutes, { prefix: '/api/portal' })
  await server.register(antonRoutes, { prefix: '/api/anton' })

  // Health check
  server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  const port = parseInt(process.env.PORT || '3000')
  const host = process.env.HOST || '0.0.0.0'

  await server.listen({ port, host })
  console.log(`🚀 API running at http://localhost:${port}`)
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
