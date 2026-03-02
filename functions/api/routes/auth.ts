import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { hashPassword, verifyPassword, createJWT, generateToken, sha256 } from '../lib/crypto'
import { queryOne, execute, queryAll } from '../lib/db'
import type { Env } from '../[[route]]'
import type { JWTPayload } from '../lib/crypto'

const ACCESS_TOKEN_TTL = 15 * 60         // 15 minutes
const REFRESH_TOKEN_TTL = 30 * 24 * 3600 // 30 days

export const authRoutes = new Hono<{ Bindings: Env }>()

authRoutes.post(
  '/login',
  zValidator('json', z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  })),
  async (c) => {
    const { username, password } = c.req.valid('json')

    const user = await queryOne<{
      id: number; username: string; email: string; password_hash: string;
      full_name: string; role: string; is_active: number
    }>(
      c.env.DB,
      'SELECT id, username, email, password_hash, full_name, role, is_active FROM users WHERE username = ? OR email = ?',
      username, username
    )

    if (!user || !user.is_active) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Update last_login
    await execute(c.env.DB, 'UPDATE users SET last_login = datetime(\'now\') WHERE id = ?', user.id)

    const now = Math.floor(Date.now() / 1000)
    const accessToken = await createJWT({
      sub: user.id,
      username: user.username,
      role: user.role,
      iat: now,
      exp: now + ACCESS_TOKEN_TTL,
    }, c.env.JWT_SECRET)

    const refreshRaw = generateToken(32)
    const refreshHash = await sha256(refreshRaw)
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000).toISOString()
    await execute(
      c.env.DB,
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      user.id, refreshHash, expiresAt
    )

    // Set refresh token as HttpOnly cookie
    c.header('Set-Cookie',
      `refresh_token=${refreshRaw}; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=${REFRESH_TOKEN_TTL}`
    )

    return c.json({
      accessToken,
      user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, role: user.role },
    })
  }
)

authRoutes.post('/refresh', async (c) => {
  const cookie = c.req.header('Cookie') ?? ''
  const match = cookie.match(/refresh_token=([^;]+)/)
  if (!match) return c.json({ error: 'No refresh token' }, 401)

  const rawToken = match[1]
  const tokenHash = await sha256(rawToken)

  const record = await queryOne<{ id: number; user_id: number; expires_at: string }>(
    c.env.DB,
    'SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = ?',
    tokenHash
  )
  if (!record || new Date(record.expires_at) < new Date()) {
    return c.json({ error: 'Invalid or expired refresh token' }, 401)
  }

  const user = await queryOne<{ id: number; username: string; role: string; is_active: number }>(
    c.env.DB,
    'SELECT id, username, role, is_active FROM users WHERE id = ?',
    record.user_id
  )
  if (!user || !user.is_active) return c.json({ error: 'User not found' }, 401)

  const now = Math.floor(Date.now() / 1000)
  const accessToken = await createJWT({
    sub: user.id,
    username: user.username,
    role: user.role,
    iat: now,
    exp: now + ACCESS_TOKEN_TTL,
  }, c.env.JWT_SECRET)

  return c.json({ accessToken })
})

authRoutes.post('/logout', async (c) => {
  const cookie = c.req.header('Cookie') ?? ''
  const match = cookie.match(/refresh_token=([^;]+)/)
  if (match) {
    const tokenHash = await sha256(match[1])
    await execute(c.env.DB, 'DELETE FROM refresh_tokens WHERE token_hash = ?', tokenHash)
  }
  c.header('Set-Cookie', 'refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=0')
  return c.json({ ok: true })
})

// Protected: require valid JWT for /me endpoints
authRoutes.use('/me', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
  const { verifyJWT } = await import('../lib/crypto')
  const payload = await verifyJWT(authHeader.slice(7), c.env.JWT_SECRET) as JWTPayload | null
  if (!payload) return c.json({ error: 'Unauthorized' }, 401)
  c.set('user', payload)
  await next()
})

authRoutes.get('/me', async (c) => {
  const user = c.get('user')
  const row = await queryOne<{
    id: number; username: string; email: string; full_name: string; role: string; last_login: string | null
  }>(
    c.env.DB,
    'SELECT id, username, email, full_name, role, last_login FROM users WHERE id = ?',
    user.sub
  )
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

authRoutes.put(
  '/me',
  zValidator('json', z.object({
    full_name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    current_password: z.string().optional(),
    new_password: z.string().min(8).optional(),
  })),
  async (c) => {
    const user = c.get('user')
    const data = c.req.valid('json')
    const fields: string[] = []
    const values: unknown[] = []

    if (data.full_name) { fields.push('full_name = ?'); values.push(data.full_name) }
    if (data.email) { fields.push('email = ?'); values.push(data.email) }

    if (data.new_password) {
      if (!data.current_password) return c.json({ error: 'Current password required' }, 400)
      const row = await queryOne<{ password_hash: string }>(
        c.env.DB, 'SELECT password_hash FROM users WHERE id = ?', user.sub
      )
      if (!row || !(await verifyPassword(data.current_password, row.password_hash))) {
        return c.json({ error: 'Current password incorrect' }, 400)
      }
      fields.push('password_hash = ?')
      values.push(await hashPassword(data.new_password))
    }

    if (fields.length === 0) return c.json({ error: 'Nothing to update' }, 400)

    fields.push('updated_at = datetime(\'now\')')
    values.push(user.sub)
    await execute(c.env.DB, `UPDATE users SET ${fields.join(', ')} WHERE id = ?`, ...values)
    return c.json({ ok: true })
  }
)

// Admin seed endpoint — only available in dev/non-production, or when no users exist
authRoutes.post(
  '/setup',
  zValidator('json', z.object({
    username: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(8),
    full_name: z.string().min(1),
    setup_key: z.string(),
  })),
  async (c) => {
    // Only allow if no users exist yet
    const existing = await queryAll<{ id: number }>(c.env.DB, 'SELECT id FROM users LIMIT 1')
    if (existing.length > 0) {
      return c.json({ error: 'Setup already completed' }, 403)
    }
    const data = c.req.valid('json')
    // Simple setup key check against JWT_SECRET to avoid open admin creation
    if (data.setup_key !== c.env.JWT_SECRET.slice(0, 16)) {
      return c.json({ error: 'Invalid setup key' }, 403)
    }
    const hash = await hashPassword(data.password)
    await execute(
      c.env.DB,
      'INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
      data.username, data.email, hash, data.full_name, 'admin'
    )
    return c.json({ ok: true, message: 'Admin user created' })
  }
)
