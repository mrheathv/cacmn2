import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { cors } from 'hono/cors'
import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import { clientRoutes } from './routes/clients'
import { leadRoutes } from './routes/leads'
import { projectRoutes } from './routes/projects'
import { estimateRoutes } from './routes/estimates'
import { workOrderRoutes } from './routes/work-orders'
import { documentRoutes } from './routes/documents'
import { subcontractorRoutes } from './routes/subcontractors'
import { dashboardRoutes } from './routes/dashboard'
import { authMiddleware } from './middleware/auth'

export type Env = {
  DB: D1Database
  R2: R2Bucket
  JWT_SECRET: string
  APP_ENV: string
  APP_NAME: string
}

const app = new Hono<{ Bindings: Env }>().basePath('/api')

// CORS (same-origin in production, open in dev)
app.use('*', cors({
  origin: (origin) => origin,
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Public routes
app.route('/auth', authRoutes)

// Protected routes — require valid JWT
app.use('*', authMiddleware)
app.route('/users', userRoutes)
app.route('/clients', clientRoutes)
app.route('/leads', leadRoutes)
app.route('/projects', projectRoutes)
app.route('/estimates', estimateRoutes)
app.route('/work-orders', workOrderRoutes)
app.route('/documents', documentRoutes)
app.route('/subcontractors', subcontractorRoutes)
app.route('/dashboard', dashboardRoutes)

// 404 fallback
app.notFound((c) => c.json({ error: 'Not found' }, 404))

// Error handler
app.onError((err, c) => {
  console.error('[API Error]', err)
  return c.json({ error: 'Internal server error' }, 500)
})

export const onRequest = handle(app)
