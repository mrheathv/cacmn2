import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { queryAll, queryOne, execute, lastInsertId, generateNumber } from '../lib/db'
import type { Env } from '../[[route]]'

export const workOrderRoutes = new Hono<{ Bindings: Env }>()

const woSchema = z.object({
  project_id: z.number().nullish(),
  client_id: z.number().nullish(),
  contact_id: z.number().nullish(),
  title: z.string().min(1),
  description: z.string().nullish(),
  scope_of_work: z.string().nullish(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  wo_type: z.enum(['repair', 'maintenance', 'inspection', 'new_work', 'warranty', 'other']).nullish(),
  scheduled_date: z.string().nullish(),
  due_date: z.string().nullish(),
  estimated_cost: z.number().nullish(),
  assigned_to: z.number().nullish(),
  notes: z.string().nullish(),
})

workOrderRoutes.get('/', async (c) => {
  const { status, project_id, assigned_to, search } = c.req.query()
  let sql = `SELECT w.*, p.project_number, p.name as project_name, c.company_name, u.full_name as assigned_name
             FROM work_orders w
             LEFT JOIN projects p ON p.id = w.project_id
             LEFT JOIN clients c ON c.id = w.client_id
             LEFT JOIN users u ON u.id = w.assigned_to
             WHERE 1=1`
  const params: unknown[] = []
  if (status) { sql += ' AND w.status = ?'; params.push(status) }
  if (project_id) { sql += ' AND w.project_id = ?'; params.push(project_id) }
  if (assigned_to) { sql += ' AND w.assigned_to = ?'; params.push(assigned_to) }
  if (search) { sql += ' AND (w.title LIKE ? OR w.wo_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
  sql += ' ORDER BY w.created_at DESC'
  return c.json(await queryAll(c.env.DB, sql, ...params))
})

workOrderRoutes.post('/', zValidator('json', woSchema), async (c) => {
  const data = c.req.valid('json')
  const user = c.get('user')
  const woNumber = await generateNumber(c.env.DB, 'work_orders', 'wo_number', 'WO')
  const result = await execute(c.env.DB,
    `INSERT INTO work_orders (wo_number, project_id, client_id, contact_id, title, description, scope_of_work,
       status, priority, wo_type, scheduled_date, due_date, estimated_cost, assigned_to, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)`,
    woNumber, data.project_id ?? null, data.client_id ?? null, data.contact_id ?? null,
    data.title, data.description ?? null, data.scope_of_work ?? null,
    data.priority ?? 'normal', data.wo_type ?? null,
    data.scheduled_date ?? null, data.due_date ?? null,
    data.estimated_cost ?? null, data.assigned_to ?? null,
    data.notes ?? null, user.sub
  )
  return c.json({ id: lastInsertId(result), wo_number: woNumber }, 201)
})

workOrderRoutes.get('/:id', async (c) => {
  const wo = await queryOne(c.env.DB,
    `SELECT w.*, p.project_number, p.name as project_name, c.company_name,
            u.full_name as assigned_name, a.full_name as approved_name
     FROM work_orders w
     LEFT JOIN projects p ON p.id = w.project_id
     LEFT JOIN clients c ON c.id = w.client_id
     LEFT JOIN users u ON u.id = w.assigned_to
     LEFT JOIN users a ON a.id = w.approved_by
     WHERE w.id = ?`,
    c.req.param('id')
  )
  if (!wo) return c.json({ error: 'Not found' }, 404)
  const docs = await queryAll(c.env.DB,
    `SELECT d.*, u.full_name as uploaded_by_name FROM documents d
     LEFT JOIN users u ON u.id = d.uploaded_by
     WHERE d.entity_type = 'work_order' AND d.entity_id = ?
     ORDER BY d.created_at DESC`,
    c.req.param('id')
  )
  return c.json({ ...wo as object, documents: docs })
})

workOrderRoutes.put('/:id', zValidator('json', woSchema.partial()), async (c) => {
  const data = c.req.valid('json')
  const fields = Object.keys(data).map(k => `${k} = ?`)
  if (!fields.length) return c.json({ error: 'Nothing to update' }, 400)
  fields.push('updated_at = datetime(\'now\')')
  await execute(c.env.DB, `UPDATE work_orders SET ${fields.join(', ')} WHERE id = ?`,
    ...Object.values(data), c.req.param('id')
  )
  return c.json({ ok: true })
})

workOrderRoutes.delete('/:id', async (c) => {
  await execute(c.env.DB, `UPDATE work_orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`, c.req.param('id'))
  return c.json({ ok: true })
})

workOrderRoutes.patch('/:id/status', zValidator('json', z.object({
  status: z.enum(['draft', 'issued', 'in_progress', 'pending_approval', 'complete', 'cancelled']),
  actual_cost: z.number().optional(),
  approved_by: z.number().optional(),
})), async (c) => {
  const user = c.get('user')
  const data = c.req.valid('json')
  const fields = ['status = ?', 'updated_at = datetime(\'now\')']
  const values: unknown[] = [data.status]

  if (data.status === 'complete') {
    fields.push('completed_date = datetime(\'now\')')
    if (data.actual_cost !== undefined) { fields.push('actual_cost = ?'); values.push(data.actual_cost) }
  }
  if (data.status === 'pending_approval') {
    fields.push('approved_by = ?'); values.push(data.approved_by ?? user.sub)
    fields.push('approved_at = datetime(\'now\')')
  }
  values.push(c.req.param('id'))
  await execute(c.env.DB, `UPDATE work_orders SET ${fields.join(', ')} WHERE id = ?`, ...values)
  return c.json({ ok: true })
})

workOrderRoutes.get('/:id/documents', async (c) => {
  return c.json(await queryAll(c.env.DB,
    `SELECT d.*, u.full_name as uploaded_by_name FROM documents d
     LEFT JOIN users u ON u.id = d.uploaded_by
     WHERE d.entity_type = 'work_order' AND d.entity_id = ?
     ORDER BY d.created_at DESC`,
    c.req.param('id')
  ))
})
