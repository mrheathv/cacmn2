import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { queryAll, queryOne, execute, lastInsertId, generateNumber } from '../lib/db'
import type { Env } from '../[[route]]'

export const projectRoutes = new Hono<{ Bindings: Env }>()

const projectSchema = z.object({
  name: z.string().min(1),
  client_id: z.number().optional(),
  lead_id: z.number().optional(),
  project_type: z.enum(['renovation', 'tenant_improvement', 'new_construction', 'addition', 'service', 'association']),
  status: z.enum(['planning', 'bidding', 'awarded', 'active', 'punch_list', 'complete', 'cancelled']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  description: z.string().optional(),
  contract_value: z.number().optional(),
  contract_type: z.enum(['lump_sum', 'gmp', 'cost_plus', 'time_materials']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  actual_end_date: z.string().optional(),
  pm_id: z.number().optional(),
  superintendent_id: z.number().optional(),
  notes: z.string().optional(),
})

projectRoutes.get('/', async (c) => {
  const { status, client_id, pm_id, search } = c.req.query()
  let sql = `SELECT p.*, c.company_name, u.full_name as pm_name
             FROM projects p
             LEFT JOIN clients c ON c.id = p.client_id
             LEFT JOIN users u ON u.id = p.pm_id
             WHERE 1=1`
  const params: unknown[] = []
  if (status) { sql += ' AND p.status = ?'; params.push(status) }
  if (client_id) { sql += ' AND p.client_id = ?'; params.push(client_id) }
  if (pm_id) { sql += ' AND p.pm_id = ?'; params.push(pm_id) }
  if (search) { sql += ' AND (p.name LIKE ? OR p.project_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
  sql += ' ORDER BY p.created_at DESC'
  return c.json(await queryAll(c.env.DB, sql, ...params))
})

projectRoutes.post('/', zValidator('json', projectSchema), async (c) => {
  const data = c.req.valid('json')
  const user = c.get('user')
  const projectNumber = await generateNumber(c.env.DB, 'projects', 'project_number', 'CAC')
  const result = await execute(c.env.DB,
    `INSERT INTO projects (project_number, name, client_id, lead_id, project_type, status, address, city, state, zip,
       description, contract_value, contract_type, start_date, end_date, pm_id, superintendent_id, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    projectNumber, data.name, data.client_id ?? null, data.lead_id ?? null,
    data.project_type, data.status ?? 'planning',
    data.address ?? null, data.city ?? null, data.state ?? 'MN', data.zip ?? null,
    data.description ?? null, data.contract_value ?? null, data.contract_type ?? null,
    data.start_date ?? null, data.end_date ?? null,
    data.pm_id ?? user.sub, data.superintendent_id ?? null,
    data.notes ?? null, user.sub
  )
  return c.json({ id: lastInsertId(result), project_number: projectNumber }, 201)
})

projectRoutes.get('/:id', async (c) => {
  const project = await queryOne(c.env.DB,
    `SELECT p.*, c.company_name, u.full_name as pm_name, s.full_name as super_name
     FROM projects p
     LEFT JOIN clients c ON c.id = p.client_id
     LEFT JOIN users u ON u.id = p.pm_id
     LEFT JOIN users s ON s.id = p.superintendent_id
     WHERE p.id = ?`,
    c.req.param('id')
  )
  if (!project) return c.json({ error: 'Not found' }, 404)
  const milestones = await queryAll(c.env.DB,
    'SELECT * FROM milestones WHERE project_id = ? ORDER BY sort_order, due_date',
    c.req.param('id')
  )
  const taskCounts = await queryAll<{ status: string; cnt: number }>(c.env.DB,
    'SELECT status, COUNT(*) as cnt FROM tasks WHERE project_id = ? GROUP BY status',
    c.req.param('id')
  )
  return c.json({ ...project as object, milestones, task_counts: taskCounts })
})

projectRoutes.put('/:id', zValidator('json', projectSchema.partial()), async (c) => {
  const data = c.req.valid('json')
  const fields = Object.keys(data).map(k => `${k} = ?`)
  if (fields.length === 0) return c.json({ error: 'Nothing to update' }, 400)
  fields.push('updated_at = datetime(\'now\')')
  await execute(c.env.DB, `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`,
    ...Object.values(data), c.req.param('id')
  )
  return c.json({ ok: true })
})

projectRoutes.delete('/:id', async (c) => {
  await execute(c.env.DB, `UPDATE projects SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`, c.req.param('id'))
  return c.json({ ok: true })
})

// Milestones
const milestoneSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  due_date: z.string().optional(),
  completed_date: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'complete', 'overdue']).optional(),
  sort_order: z.number().optional(),
})

projectRoutes.get('/:id/milestones', async (c) => {
  return c.json(await queryAll(c.env.DB,
    'SELECT * FROM milestones WHERE project_id = ? ORDER BY sort_order, id',
    c.req.param('id')
  ))
})

projectRoutes.post('/:id/milestones', zValidator('json', milestoneSchema), async (c) => {
  const data = c.req.valid('json')
  const maxOrder = await queryOne<{ max_order: number | null }>(c.env.DB,
    'SELECT MAX(sort_order) as max_order FROM milestones WHERE project_id = ?', c.req.param('id')
  )
  const result = await execute(c.env.DB,
    `INSERT INTO milestones (project_id, name, description, due_date, completed_date, status, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    c.req.param('id'), data.name, data.description ?? null,
    data.due_date ?? null, data.completed_date ?? null,
    data.status ?? 'pending', data.sort_order ?? ((maxOrder?.max_order ?? -1) + 1)
  )
  return c.json({ id: lastInsertId(result) }, 201)
})

projectRoutes.put('/:id/milestones/:mid', zValidator('json', milestoneSchema.partial()), async (c) => {
  const data = c.req.valid('json')
  const fields = Object.keys(data).map(k => `${k} = ?`)
  if (fields.length === 0) return c.json({ error: 'Nothing to update' }, 400)
  fields.push('updated_at = datetime(\'now\')')
  await execute(c.env.DB, `UPDATE milestones SET ${fields.join(', ')} WHERE id = ? AND project_id = ?`,
    ...Object.values(data), c.req.param('mid'), c.req.param('id')
  )
  return c.json({ ok: true })
})

projectRoutes.delete('/:id/milestones/:mid', async (c) => {
  await execute(c.env.DB, 'DELETE FROM milestones WHERE id = ? AND project_id = ?',
    c.req.param('mid'), c.req.param('id')
  )
  return c.json({ ok: true })
})

projectRoutes.patch('/:id/milestones/reorder', zValidator('json', z.object({ ids: z.array(z.number()) })), async (c) => {
  const { ids } = c.req.valid('json')
  for (let i = 0; i < ids.length; i++) {
    await execute(c.env.DB, 'UPDATE milestones SET sort_order = ? WHERE id = ? AND project_id = ?',
      i, ids[i], c.req.param('id')
    )
  }
  return c.json({ ok: true })
})

// Tasks
const taskSchema = z.object({
  milestone_id: z.number().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  assigned_to: z.number().optional(),
  status: z.enum(['todo', 'in_progress', 'blocked', 'done']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  due_date: z.string().optional(),
  completed_date: z.string().optional(),
  sort_order: z.number().optional(),
})

projectRoutes.get('/:id/tasks', async (c) => {
  const { milestone_id, status, assigned_to } = c.req.query()
  let sql = `SELECT t.*, u.full_name as assigned_name FROM tasks t
             LEFT JOIN users u ON u.id = t.assigned_to
             WHERE t.project_id = ?`
  const params: unknown[] = [c.req.param('id')]
  if (milestone_id) { sql += ' AND t.milestone_id = ?'; params.push(milestone_id) }
  if (status) { sql += ' AND t.status = ?'; params.push(status) }
  if (assigned_to) { sql += ' AND t.assigned_to = ?'; params.push(assigned_to) }
  sql += ' ORDER BY t.sort_order, t.id'
  return c.json(await queryAll(c.env.DB, sql, ...params))
})

projectRoutes.post('/:id/tasks', zValidator('json', taskSchema), async (c) => {
  const data = c.req.valid('json')
  const user = c.get('user')
  const result = await execute(c.env.DB,
    `INSERT INTO tasks (project_id, milestone_id, title, description, assigned_to, status, priority, due_date, sort_order, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    c.req.param('id'), data.milestone_id ?? null, data.title,
    data.description ?? null, data.assigned_to ?? null,
    data.status ?? 'todo', data.priority ?? 'normal',
    data.due_date ?? null, data.sort_order ?? 0, user.sub
  )
  return c.json({ id: lastInsertId(result) }, 201)
})

projectRoutes.put('/:id/tasks/:tid', zValidator('json', taskSchema.partial()), async (c) => {
  const data = c.req.valid('json')
  if ('status' in data && data.status === 'done' && !('completed_date' in data)) {
    (data as Record<string, unknown>).completed_date = new Date().toISOString()
  }
  const fields = Object.keys(data).map(k => `${k} = ?`)
  if (fields.length === 0) return c.json({ error: 'Nothing to update' }, 400)
  fields.push('updated_at = datetime(\'now\')')
  await execute(c.env.DB, `UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND project_id = ?`,
    ...Object.values(data), c.req.param('tid'), c.req.param('id')
  )
  return c.json({ ok: true })
})

projectRoutes.delete('/:id/tasks/:tid', async (c) => {
  await execute(c.env.DB, 'DELETE FROM tasks WHERE id = ? AND project_id = ?',
    c.req.param('tid'), c.req.param('id')
  )
  return c.json({ ok: true })
})

projectRoutes.get('/:id/documents', async (c) => {
  return c.json(await queryAll(c.env.DB,
    `SELECT d.*, u.full_name as uploaded_by_name FROM documents d
     LEFT JOIN users u ON u.id = d.uploaded_by
     WHERE d.entity_type = 'project' AND d.entity_id = ?
     ORDER BY d.created_at DESC`,
    c.req.param('id')
  ))
})

projectRoutes.get('/:id/subcontractors', async (c) => {
  return c.json(await queryAll(c.env.DB,
    `SELECT sp.*, s.company_name, s.trade, s.contact_name, s.contact_phone
     FROM subcontractor_projects sp
     JOIN subcontractors s ON s.id = sp.subcontractor_id
     WHERE sp.project_id = ?`,
    c.req.param('id')
  ))
})
