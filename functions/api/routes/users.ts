import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { hashPassword } from '../lib/crypto'
import { queryAll, queryOne, execute, lastInsertId } from '../lib/db'
import { requireRole } from '../middleware/auth'
import type { Env } from '../[[route]]'

export const userRoutes = new Hono<{ Bindings: Env }>()

// Admin only for all user management
userRoutes.use('*', requireRole('admin'))

userRoutes.get('/', async (c) => {
  const users = await queryAll(
    c.env.DB,
    'SELECT id, username, email, full_name, role, is_active, last_login, created_at FROM users ORDER BY full_name'
  )
  return c.json(users)
})

userRoutes.post(
  '/',
  zValidator('json', z.object({
    username: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(8),
    full_name: z.string().min(1),
    role: z.enum(['admin', 'pm', 'estimator', 'staff']),
  })),
  async (c) => {
    const data = c.req.valid('json')
    const hash = await hashPassword(data.password)
    const result = await execute(
      c.env.DB,
      'INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
      data.username, data.email, hash, data.full_name, data.role
    )
    const id = lastInsertId(result)
    return c.json({ id }, 201)
  }
)

userRoutes.get('/:id', async (c) => {
  const user = await queryOne(
    c.env.DB,
    'SELECT id, username, email, full_name, role, is_active, last_login, created_at FROM users WHERE id = ?',
    c.req.param('id')
  )
  if (!user) return c.json({ error: 'Not found' }, 404)
  return c.json(user)
})

userRoutes.put(
  '/:id',
  zValidator('json', z.object({
    username: z.string().min(3).optional(),
    email: z.string().email().optional(),
    full_name: z.string().min(1).optional(),
    role: z.enum(['admin', 'pm', 'estimator', 'staff']).optional(),
    is_active: z.boolean().optional(),
    password: z.string().min(8).optional(),
  })),
  async (c) => {
    const data = c.req.valid('json')
    const fields: string[] = []
    const values: unknown[] = []

    if (data.username !== undefined) { fields.push('username = ?'); values.push(data.username) }
    if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email) }
    if (data.full_name !== undefined) { fields.push('full_name = ?'); values.push(data.full_name) }
    if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role) }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0) }
    if (data.password !== undefined) {
      fields.push('password_hash = ?')
      values.push(await hashPassword(data.password))
    }

    if (fields.length === 0) return c.json({ error: 'Nothing to update' }, 400)
    fields.push('updated_at = datetime(\'now\')')
    values.push(c.req.param('id'))
    await execute(c.env.DB, `UPDATE users SET ${fields.join(', ')} WHERE id = ?`, ...values)
    return c.json({ ok: true })
  }
)

userRoutes.delete('/:id', async (c) => {
  const me = c.get('user')
  if (me.sub === Number(c.req.param('id'))) {
    return c.json({ error: 'Cannot deactivate yourself' }, 400)
  }
  await execute(
    c.env.DB,
    'UPDATE users SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?',
    c.req.param('id')
  )
  return c.json({ ok: true })
})
