import type { Context, Next } from 'hono'
import { verifyJWT, type JWTPayload } from '../lib/crypto'
import type { Env } from '../[[route]]'

declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload
  }
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const token = authHeader.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
  c.set('user', payload)
  await next()
}

/** Require specific roles. Usage: requireRole('admin', 'pm') */
export function requireRole(...roles: string[]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const user = c.get('user')
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: 'Forbidden' }, 403)
    }
    await next()
  }
}
