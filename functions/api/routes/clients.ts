import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { queryAll, queryOne, execute, lastInsertId } from '../lib/db'
import type { Env } from '../[[route]]'

export const clientRoutes = new Hono<{ Bindings: Env }>()

const clientSchema = z.object({
  company_name: z.string().min(1),
  industry: z.enum(['retail', 'office', 'medical', 'hospitality', 'industrial', 'education', 'government', 'association', 'other']).optional(),
  website: z.string().url().optional().or(z.literal('')),
  billing_address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'prospect']).optional(),
})

clientRoutes.get('/', async (c) => {
  const { status, search } = c.req.query()
  let sql = 'SELECT * FROM clients WHERE 1=1'
  const params: unknown[] = []
  if (status) { sql += ' AND status = ?'; params.push(status) }
  if (search) { sql += ' AND company_name LIKE ?'; params.push(`%${search}%`) }
  sql += ' ORDER BY company_name'
  return c.json(await queryAll(c.env.DB, sql, ...params))
})

clientRoutes.post('/', zValidator('json', clientSchema), async (c) => {
  const data = c.req.valid('json')
  const user = c.get('user')
  const result = await execute(
    c.env.DB,
    `INSERT INTO clients (company_name, industry, website, billing_address, city, state, zip, notes, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    data.company_name, data.industry ?? null, data.website ?? null,
    data.billing_address ?? null, data.city ?? null, data.state ?? 'MN',
    data.zip ?? null, data.notes ?? null, data.status ?? 'active', user.sub
  )
  return c.json({ id: lastInsertId(result) }, 201)
})

clientRoutes.get('/:id', async (c) => {
  const client = await queryOne(c.env.DB, 'SELECT * FROM clients WHERE id = ?', c.req.param('id'))
  if (!client) return c.json({ error: 'Not found' }, 404)
  const contacts = await queryAll(c.env.DB, 'SELECT * FROM contacts WHERE client_id = ? ORDER BY is_primary DESC, last_name', c.req.param('id'))
  return c.json({ ...client as object, contacts })
})

clientRoutes.put('/:id', zValidator('json', clientSchema.partial()), async (c) => {
  const data = c.req.valid('json')
  const fields = Object.keys(data).map(k => `${k} = ?`)
  if (fields.length === 0) return c.json({ error: 'Nothing to update' }, 400)
  fields.push('updated_at = datetime(\'now\')')
  await execute(c.env.DB, `UPDATE clients SET ${fields.join(', ')} WHERE id = ?`, ...Object.values(data), c.req.param('id'))
  return c.json({ ok: true })
})

clientRoutes.delete('/:id', async (c) => {
  await execute(c.env.DB, 'UPDATE clients SET status = \'inactive\', updated_at = datetime(\'now\') WHERE id = ?', c.req.param('id'))
  return c.json({ ok: true })
})

// Contacts
const contactSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  title: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  phone_ext: z.string().optional(),
  mobile: z.string().optional(),
  is_primary: z.boolean().optional(),
  notes: z.string().optional(),
})

clientRoutes.get('/:id/contacts', async (c) => {
  return c.json(await queryAll(c.env.DB,
    'SELECT * FROM contacts WHERE client_id = ? ORDER BY is_primary DESC, last_name',
    c.req.param('id')
  ))
})

clientRoutes.post('/:id/contacts', zValidator('json', contactSchema), async (c) => {
  const data = c.req.valid('json')
  if (data.is_primary) {
    await execute(c.env.DB, 'UPDATE contacts SET is_primary = 0 WHERE client_id = ?', c.req.param('id'))
  }
  const result = await execute(c.env.DB,
    `INSERT INTO contacts (client_id, first_name, last_name, title, email, phone, phone_ext, mobile, is_primary, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    c.req.param('id'), data.first_name, data.last_name, data.title ?? null,
    data.email ?? null, data.phone ?? null, data.phone_ext ?? null,
    data.mobile ?? null, data.is_primary ? 1 : 0, data.notes ?? null
  )
  return c.json({ id: lastInsertId(result) }, 201)
})

clientRoutes.put('/:id/contacts/:cid', zValidator('json', contactSchema.partial()), async (c) => {
  const data = c.req.valid('json')
  if (data.is_primary) {
    await execute(c.env.DB, 'UPDATE contacts SET is_primary = 0 WHERE client_id = ?', c.req.param('id'))
  }
  const fields = Object.keys(data).map(k => `${k} = ?`)
  if (fields.length === 0) return c.json({ error: 'Nothing to update' }, 400)
  fields.push('updated_at = datetime(\'now\')')
  const values = Object.values(data).map(v => typeof v === 'boolean' ? (v ? 1 : 0) : v)
  await execute(c.env.DB, `UPDATE contacts SET ${fields.join(', ')} WHERE id = ? AND client_id = ?`,
    ...values, c.req.param('cid'), c.req.param('id')
  )
  return c.json({ ok: true })
})

clientRoutes.delete('/:id/contacts/:cid', async (c) => {
  await execute(c.env.DB, 'DELETE FROM contacts WHERE id = ? AND client_id = ?', c.req.param('cid'), c.req.param('id'))
  return c.json({ ok: true })
})

// Activities
const activitySchema = z.object({
  contact_id: z.number().optional(),
  lead_id: z.number().optional(),
  activity_type: z.enum(['call', 'email', 'meeting', 'note', 'site_visit']),
  subject: z.string().min(1),
  body: z.string().optional(),
  activity_date: z.string().optional(),
})

clientRoutes.get('/:id/activities', async (c) => {
  return c.json(await queryAll(c.env.DB,
    `SELECT a.*, u.full_name as created_by_name FROM client_activities a
     LEFT JOIN users u ON u.id = a.created_by
     WHERE a.client_id = ? ORDER BY a.activity_date DESC LIMIT 50`,
    c.req.param('id')
  ))
})

clientRoutes.post('/:id/activities', zValidator('json', activitySchema), async (c) => {
  const data = c.req.valid('json')
  const user = c.get('user')
  const result = await execute(c.env.DB,
    `INSERT INTO client_activities (client_id, contact_id, lead_id, activity_type, subject, body, activity_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    c.req.param('id'), data.contact_id ?? null, data.lead_id ?? null,
    data.activity_type, data.subject, data.body ?? null,
    data.activity_date ?? new Date().toISOString(), user.sub
  )
  return c.json({ id: lastInsertId(result) }, 201)
})

clientRoutes.delete('/:id/activities/:aid', async (c) => {
  await execute(c.env.DB, 'DELETE FROM client_activities WHERE id = ? AND client_id = ?', c.req.param('aid'), c.req.param('id'))
  return c.json({ ok: true })
})

// Related data
clientRoutes.get('/:id/projects', async (c) => {
  return c.json(await queryAll(c.env.DB,
    'SELECT id, project_number, name, status, contract_value, start_date, end_date FROM projects WHERE client_id = ? ORDER BY created_at DESC',
    c.req.param('id')
  ))
})

clientRoutes.get('/:id/estimates', async (c) => {
  return c.json(await queryAll(c.env.DB,
    'SELECT id, estimate_number, title, status, total, created_at FROM estimates WHERE client_id = ? ORDER BY created_at DESC',
    c.req.param('id')
  ))
})
