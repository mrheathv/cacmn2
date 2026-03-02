import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { queryAll, queryOne, execute, lastInsertId, generateNumber } from '../lib/db'
import type { Env } from '../[[route]]'

export const estimateRoutes = new Hono<{ Bindings: Env }>()

const estimateSchema = z.object({
  project_id: z.number().optional(),
  client_id: z.number(),
  contact_id: z.number().optional(),
  lead_id: z.number().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  valid_until: z.string().optional(),
  markup_pct: z.number().min(0).optional(),
  tax_pct: z.number().min(0).optional(),
  notes: z.string().optional(),
  client_notes: z.string().optional(),
  terms: z.string().optional(),
})

estimateRoutes.get('/', async (c) => {
  const { status, client_id, search } = c.req.query()
  let sql = `SELECT e.*, c.company_name, u.full_name as created_by_name
             FROM estimates e
             LEFT JOIN clients c ON c.id = e.client_id
             LEFT JOIN users u ON u.id = e.created_by
             WHERE 1=1`
  const params: unknown[] = []
  if (status) { sql += ' AND e.status = ?'; params.push(status) }
  if (client_id) { sql += ' AND e.client_id = ?'; params.push(client_id) }
  if (search) { sql += ' AND (e.title LIKE ? OR e.estimate_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
  sql += ' ORDER BY e.created_at DESC'
  return c.json(await queryAll(c.env.DB, sql, ...params))
})

estimateRoutes.post('/', zValidator('json', estimateSchema), async (c) => {
  const data = c.req.valid('json')
  const user = c.get('user')
  const estNumber = await generateNumber(c.env.DB, 'estimates', 'estimate_number', 'EST')
  const result = await execute(c.env.DB,
    `INSERT INTO estimates (estimate_number, project_id, client_id, contact_id, lead_id, title, description,
       valid_until, markup_pct, tax_pct, notes, client_notes, terms, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    estNumber, data.project_id ?? null, data.client_id, data.contact_id ?? null,
    data.lead_id ?? null, data.title, data.description ?? null,
    data.valid_until ?? null, data.markup_pct ?? 0, data.tax_pct ?? 0,
    data.notes ?? null, data.client_notes ?? null, data.terms ?? 'Net 30', user.sub
  )
  return c.json({ id: lastInsertId(result), estimate_number: estNumber }, 201)
})

estimateRoutes.get('/:id', async (c) => {
  const estimate = await queryOne(c.env.DB,
    `SELECT e.*, c.company_name, ct.first_name || ' ' || ct.last_name as contact_name
     FROM estimates e
     LEFT JOIN clients c ON c.id = e.client_id
     LEFT JOIN contacts ct ON ct.id = e.contact_id
     WHERE e.id = ?`,
    c.req.param('id')
  )
  if (!estimate) return c.json({ error: 'Not found' }, 404)
  const sections = await queryAll(c.env.DB,
    'SELECT * FROM estimate_sections WHERE estimate_id = ? ORDER BY sort_order',
    c.req.param('id')
  )
  const lineItems = await queryAll(c.env.DB,
    'SELECT * FROM estimate_line_items WHERE estimate_id = ? ORDER BY section_id, sort_order',
    c.req.param('id')
  )
  return c.json({ ...estimate as object, sections, line_items: lineItems })
})

estimateRoutes.put('/:id', zValidator('json', estimateSchema.partial()), async (c) => {
  const data = c.req.valid('json')
  const fields = Object.keys(data).map(k => `${k} = ?`)
  if (fields.length === 0) return c.json({ error: 'Nothing to update' }, 400)
  fields.push('updated_at = datetime(\'now\')')
  await execute(c.env.DB, `UPDATE estimates SET ${fields.join(', ')} WHERE id = ?`,
    ...Object.values(data), c.req.param('id')
  )
  return c.json({ ok: true })
})

estimateRoutes.delete('/:id', async (c) => {
  await execute(c.env.DB, 'DELETE FROM estimates WHERE id = ?', c.req.param('id'))
  return c.json({ ok: true })
})

// Recalculate totals
async function recalcTotals(db: D1Database, estimateId: string | number) {
  const items = await queryAll<{ total_cost: number }>(db,
    'SELECT total_cost FROM estimate_line_items WHERE estimate_id = ?', estimateId
  )
  const subtotal = items.reduce((sum, i) => sum + (i.total_cost || 0), 0)
  const est = await queryOne<{ markup_pct: number; tax_pct: number }>(db,
    'SELECT markup_pct, tax_pct FROM estimates WHERE id = ?', estimateId
  )
  const markup = subtotal * ((est?.markup_pct ?? 0) / 100)
  const tax = (subtotal + markup) * ((est?.tax_pct ?? 0) / 100)
  await execute(db,
    `UPDATE estimates SET subtotal = ?, markup_amount = ?, tax_amount = ?, total = ?, updated_at = datetime('now') WHERE id = ?`,
    subtotal, markup, tax, subtotal + markup + tax, estimateId
  )
}

// Sections
estimateRoutes.post('/:id/sections', zValidator('json', z.object({ name: z.string().min(1), sort_order: z.number().optional() })), async (c) => {
  const data = c.req.valid('json')
  const result = await execute(c.env.DB,
    'INSERT INTO estimate_sections (estimate_id, name, sort_order) VALUES (?, ?, ?)',
    c.req.param('id'), data.name, data.sort_order ?? 0
  )
  return c.json({ id: lastInsertId(result) }, 201)
})

estimateRoutes.put('/:id/sections/:sid', zValidator('json', z.object({ name: z.string().min(1).optional(), sort_order: z.number().optional() })), async (c) => {
  const data = c.req.valid('json')
  const fields = Object.keys(data).map(k => `${k} = ?`)
  if (!fields.length) return c.json({ error: 'Nothing to update' }, 400)
  await execute(c.env.DB, `UPDATE estimate_sections SET ${fields.join(', ')} WHERE id = ? AND estimate_id = ?`,
    ...Object.values(data), c.req.param('sid'), c.req.param('id')
  )
  return c.json({ ok: true })
})

estimateRoutes.delete('/:id/sections/:sid', async (c) => {
  await execute(c.env.DB, 'UPDATE estimate_line_items SET section_id = NULL WHERE section_id = ?', c.req.param('sid'))
  await execute(c.env.DB, 'DELETE FROM estimate_sections WHERE id = ? AND estimate_id = ?', c.req.param('sid'), c.req.param('id'))
  return c.json({ ok: true })
})

estimateRoutes.patch('/:id/sections/reorder', zValidator('json', z.object({ ids: z.array(z.number()) })), async (c) => {
  const { ids } = c.req.valid('json')
  for (let i = 0; i < ids.length; i++) {
    await execute(c.env.DB, 'UPDATE estimate_sections SET sort_order = ? WHERE id = ? AND estimate_id = ?',
      i, ids[i], c.req.param('id')
    )
  }
  return c.json({ ok: true })
})

// Line items
const lineItemSchema = z.object({
  section_id: z.number().optional(),
  description: z.string().min(1),
  quantity: z.number().min(0),
  unit: z.enum(['SF', 'LF', 'EA', 'LS', 'HR', 'CY', 'TN', 'GAL', 'SQ']).optional(),
  unit_cost: z.number().min(0),
  category: z.enum(['labor', 'material', 'equipment', 'subcontractor', 'other']).optional(),
  notes: z.string().optional(),
  sort_order: z.number().optional(),
})

estimateRoutes.post('/:id/line-items', zValidator('json', lineItemSchema), async (c) => {
  const data = c.req.valid('json')
  const total = data.quantity * data.unit_cost
  const result = await execute(c.env.DB,
    `INSERT INTO estimate_line_items (estimate_id, section_id, description, quantity, unit, unit_cost, total_cost, category, notes, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    c.req.param('id'), data.section_id ?? null, data.description,
    data.quantity, data.unit ?? 'LS', data.unit_cost, total,
    data.category ?? 'other', data.notes ?? null, data.sort_order ?? 0
  )
  await recalcTotals(c.env.DB, c.req.param('id'))
  return c.json({ id: lastInsertId(result), total_cost: total }, 201)
})

estimateRoutes.put('/:id/line-items/:lid', zValidator('json', lineItemSchema.partial()), async (c) => {
  const data = c.req.valid('json')
  // Recalculate total_cost if qty or unit_cost change
  if (data.quantity !== undefined || data.unit_cost !== undefined) {
    const existing = await queryOne<{ quantity: number; unit_cost: number }>(c.env.DB,
      'SELECT quantity, unit_cost FROM estimate_line_items WHERE id = ?', c.req.param('lid')
    )
    if (existing) {
      const qty = data.quantity ?? existing.quantity
      const uc = data.unit_cost ?? existing.unit_cost
      ;(data as Record<string, unknown>).total_cost = qty * uc
    }
  }
  const fields = Object.keys(data).map(k => `${k} = ?`)
  if (!fields.length) return c.json({ error: 'Nothing to update' }, 400)
  fields.push('updated_at = datetime(\'now\')')
  await execute(c.env.DB, `UPDATE estimate_line_items SET ${fields.join(', ')} WHERE id = ? AND estimate_id = ?`,
    ...Object.values(data), c.req.param('lid'), c.req.param('id')
  )
  await recalcTotals(c.env.DB, c.req.param('id'))
  return c.json({ ok: true })
})

estimateRoutes.delete('/:id/line-items/:lid', async (c) => {
  await execute(c.env.DB, 'DELETE FROM estimate_line_items WHERE id = ? AND estimate_id = ?',
    c.req.param('lid'), c.req.param('id')
  )
  await recalcTotals(c.env.DB, c.req.param('id'))
  return c.json({ ok: true })
})

// Status actions
estimateRoutes.post('/:id/send', async (c) => {
  await execute(c.env.DB, `UPDATE estimates SET status = 'sent', sent_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`, c.req.param('id'))
  return c.json({ ok: true })
})

estimateRoutes.post('/:id/accept', async (c) => {
  await execute(c.env.DB, `UPDATE estimates SET status = 'accepted', accepted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`, c.req.param('id'))
  return c.json({ ok: true })
})

estimateRoutes.post('/:id/reject', zValidator('json', z.object({ reason: z.string().optional() })), async (c) => {
  const { reason } = c.req.valid('json')
  await execute(c.env.DB,
    `UPDATE estimates SET status = 'rejected', rejected_at = datetime('now'), rejected_reason = ?, updated_at = datetime('now') WHERE id = ?`,
    reason ?? null, c.req.param('id')
  )
  return c.json({ ok: true })
})

estimateRoutes.post('/:id/duplicate', async (c) => {
  const user = c.get('user')
  const est = await queryOne<{
    project_id: number | null; client_id: number; contact_id: number | null; lead_id: number | null;
    title: string; description: string | null; markup_pct: number; tax_pct: number;
    notes: string | null; client_notes: string | null; terms: string | null;
  }>(c.env.DB, 'SELECT * FROM estimates WHERE id = ?', c.req.param('id'))
  if (!est) return c.json({ error: 'Not found' }, 404)

  const newNumber = await generateNumber(c.env.DB, 'estimates', 'estimate_number', 'EST')
  const result = await execute(c.env.DB,
    `INSERT INTO estimates (estimate_number, project_id, client_id, contact_id, lead_id, title, description,
       markup_pct, tax_pct, notes, client_notes, terms, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    newNumber, est.project_id, est.client_id, est.contact_id, est.lead_id,
    `${est.title} (Copy)`, est.description, est.markup_pct, est.tax_pct,
    est.notes, est.client_notes, est.terms, user.sub
  )
  const newId = lastInsertId(result)

  // Copy sections
  const sections = await queryAll<{ id: number; name: string; sort_order: number }>(c.env.DB,
    'SELECT id, name, sort_order FROM estimate_sections WHERE estimate_id = ?', c.req.param('id')
  )
  const sectionMap: Record<number, number> = {}
  for (const s of sections) {
    const sr = await execute(c.env.DB,
      'INSERT INTO estimate_sections (estimate_id, name, sort_order) VALUES (?, ?, ?)',
      newId, s.name, s.sort_order
    )
    sectionMap[s.id] = lastInsertId(sr)
  }

  // Copy line items
  const items = await queryAll<{
    section_id: number | null; description: string; quantity: number; unit: string;
    unit_cost: number; total_cost: number; category: string; notes: string | null; sort_order: number
  }>(c.env.DB, 'SELECT * FROM estimate_line_items WHERE estimate_id = ?', c.req.param('id'))
  for (const item of items) {
    await execute(c.env.DB,
      `INSERT INTO estimate_line_items (estimate_id, section_id, description, quantity, unit, unit_cost, total_cost, category, notes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newId, item.section_id ? sectionMap[item.section_id] ?? null : null,
      item.description, item.quantity, item.unit, item.unit_cost, item.total_cost,
      item.category, item.notes, item.sort_order
    )
  }
  await recalcTotals(c.env.DB, newId)
  return c.json({ id: newId, estimate_number: newNumber }, 201)
})

type D1Database = {
  prepare: (sql: string) => { bind: (...args: unknown[]) => { all: <T>() => Promise<{ results: T[] }>; first: <T>() => Promise<T | null>; run: () => Promise<unknown> } }
}
