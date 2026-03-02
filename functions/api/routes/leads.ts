import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { queryAll, queryOne, execute, lastInsertId, generateNumber } from '../lib/db'
import type { Env } from '../[[route]]'

export const leadRoutes = new Hono<{ Bindings: Env }>()

const leadSchema = z.object({
  client_id: z.number().optional(),
  contact_id: z.number().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  estimated_value: z.number().optional(),
  stage: z.enum(['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']).optional(),
  source: z.enum(['referral', 'repeat', 'cold', 'bid_board', 'website', 'other']).optional(),
  probability: z.number().min(0).max(100).optional(),
  expected_close: z.string().optional(),
  assigned_to: z.number().optional(),
  lost_reason: z.string().optional(),
})

leadRoutes.get('/', async (c) => {
  const { stage, assigned_to, search } = c.req.query()
  let sql = `SELECT l.*, c.company_name, u.full_name as assigned_name
             FROM leads l
             LEFT JOIN clients c ON c.id = l.client_id
             LEFT JOIN users u ON u.id = l.assigned_to
             WHERE 1=1`
  const params: unknown[] = []
  if (stage) { sql += ' AND l.stage = ?'; params.push(stage) }
  if (assigned_to) { sql += ' AND l.assigned_to = ?'; params.push(assigned_to) }
  if (search) { sql += ' AND l.title LIKE ?'; params.push(`%${search}%`) }
  sql += ' ORDER BY l.created_at DESC'
  return c.json(await queryAll(c.env.DB, sql, ...params))
})

leadRoutes.post('/', zValidator('json', leadSchema), async (c) => {
  const data = c.req.valid('json')
  const user = c.get('user')
  const result = await execute(c.env.DB,
    `INSERT INTO leads (client_id, contact_id, title, description, estimated_value, stage, source, probability, expected_close, assigned_to, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    data.client_id ?? null, data.contact_id ?? null, data.title,
    data.description ?? null, data.estimated_value ?? null,
    data.stage ?? 'new', data.source ?? null,
    data.probability ?? 50, data.expected_close ?? null,
    data.assigned_to ?? null, user.sub
  )
  return c.json({ id: lastInsertId(result) }, 201)
})

leadRoutes.get('/:id', async (c) => {
  const lead = await queryOne(c.env.DB,
    `SELECT l.*, c.company_name, u.full_name as assigned_name
     FROM leads l LEFT JOIN clients c ON c.id = l.client_id
     LEFT JOIN users u ON u.id = l.assigned_to
     WHERE l.id = ?`,
    c.req.param('id')
  )
  if (!lead) return c.json({ error: 'Not found' }, 404)
  return c.json(lead)
})

leadRoutes.put('/:id', zValidator('json', leadSchema.partial()), async (c) => {
  const data = c.req.valid('json')
  const fields = Object.keys(data).map(k => `${k} = ?`)
  if (fields.length === 0) return c.json({ error: 'Nothing to update' }, 400)
  fields.push('updated_at = datetime(\'now\')')
  await execute(c.env.DB, `UPDATE leads SET ${fields.join(', ')} WHERE id = ?`,
    ...Object.values(data), c.req.param('id')
  )
  return c.json({ ok: true })
})

leadRoutes.delete('/:id', async (c) => {
  await execute(c.env.DB, 'DELETE FROM leads WHERE id = ?', c.req.param('id'))
  return c.json({ ok: true })
})

leadRoutes.post('/:id/convert', zValidator('json', z.object({
  project_type: z.enum(['renovation', 'tenant_improvement', 'new_construction', 'addition', 'service', 'association']),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
})), async (c) => {
  const lead = await queryOne<{
    id: number; title: string; client_id: number | null; estimated_value: number | null
  }>(c.env.DB, 'SELECT id, title, client_id, estimated_value FROM leads WHERE id = ?', c.req.param('id'))
  if (!lead) return c.json({ error: 'Lead not found' }, 404)

  const user = c.get('user')
  const data = c.req.valid('json')
  const projectNumber = await generateNumber(c.env.DB, 'projects', 'project_number', 'CAC')

  const result = await execute(c.env.DB,
    `INSERT INTO projects (project_number, name, client_id, lead_id, project_type, status, contract_value, start_date, end_date, pm_id, created_by)
     VALUES (?, ?, ?, ?, ?, 'awarded', ?, ?, ?, ?, ?)`,
    projectNumber, lead.title, lead.client_id, lead.id, data.project_type,
    lead.estimated_value ?? null, data.start_date ?? null, data.end_date ?? null,
    user.sub, user.sub
  )
  const projectId = lastInsertId(result)

  await execute(c.env.DB, `UPDATE leads SET stage = 'won', updated_at = datetime('now') WHERE id = ?`, lead.id)

  return c.json({ project_id: projectId, project_number: projectNumber }, 201)
})
