import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { queryAll, queryOne, execute, lastInsertId } from '../lib/db'
import type { Env } from '../[[route]]'

export const subcontractorRoutes = new Hono<{ Bindings: Env }>()

const TRADES = ['electrical', 'plumbing', 'hvac', 'framing', 'drywall', 'flooring', 'painting',
  'roofing', 'concrete', 'steel', 'glass_glazing', 'elevator', 'fire_protection',
  'low_voltage', 'landscaping', 'demolition', 'general', 'other'] as const

const subSchema = z.object({
  company_name: z.string().min(1),
  trade: z.enum(TRADES),
  additional_trades: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  license_number: z.string().optional(),
  license_state: z.string().optional(),
  license_expiry: z.string().optional(),
  insurance_carrier: z.string().optional(),
  insurance_policy: z.string().optional(),
  insurance_expiry: z.string().optional(),
  insurance_amount: z.number().nullish(),
  w9_on_file: z.boolean().optional(),
  prequalified: z.boolean().optional(),
  rating: z.number().min(1).max(5).nullish(),
  status: z.enum(['active', 'inactive', 'do_not_use']).optional(),
  notes: z.string().optional(),
})

subcontractorRoutes.get('/', async (c) => {
  const { trade, status, search } = c.req.query()
  let sql = `SELECT s.*,
    (SELECT (COALESCE(c.criterion_1_verified,0)+COALESCE(c.criterion_2_verified,0)+COALESCE(c.criterion_3_verified,0)+
             COALESCE(c.criterion_4_verified,0)+COALESCE(c.criterion_5_verified,0)+COALESCE(c.criterion_6_verified,0)+
             COALESCE(c.criterion_7_verified,0)+COALESCE(c.criterion_8_verified,0)+COALESCE(c.criterion_9_verified,0)+
             COALESCE(c.criterion_10_verified,0)+COALESCE(c.criterion_11_verified,0)+COALESCE(c.criterion_12_verified,0)+
             COALESCE(c.criterion_13_verified,0)+COALESCE(c.criterion_14_verified,0))
     FROM subcontractor_mn_compliance c WHERE c.subcontractor_id = s.id) as verified_count
  FROM subcontractors s WHERE 1=1`
  const params: unknown[] = []
  if (trade) { sql += ' AND s.trade = ?'; params.push(trade) }
  if (status) { sql += ' AND s.status = ?'; params.push(status) }
  if (search) { sql += ' AND (s.company_name LIKE ? OR s.contact_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
  sql += ' ORDER BY s.company_name'
  return c.json(await queryAll(c.env.DB, sql, ...params))
})

subcontractorRoutes.post('/', zValidator('json', subSchema), async (c) => {
  const data = c.req.valid('json')
  const user = c.get('user')
  const result = await execute(c.env.DB,
    `INSERT INTO subcontractors (company_name, trade, additional_trades, contact_name, contact_email, contact_phone,
       address, city, state, zip, website, license_number, license_state, license_expiry,
       insurance_carrier, insurance_policy, insurance_expiry, insurance_amount,
       w9_on_file, prequalified, rating, status, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    data.company_name, data.trade, data.additional_trades ?? null,
    data.contact_name ?? null, data.contact_email ?? null, data.contact_phone ?? null,
    data.address ?? null, data.city ?? null, data.state ?? 'MN', data.zip ?? null,
    data.website ?? null, data.license_number ?? null, data.license_state ?? 'MN',
    data.license_expiry ?? null, data.insurance_carrier ?? null, data.insurance_policy ?? null,
    data.insurance_expiry ?? null, data.insurance_amount ?? null,
    data.w9_on_file ? 1 : 0, data.prequalified ? 1 : 0,
    data.rating ?? null, data.status ?? 'active', data.notes ?? null, user.sub
  )
  return c.json({ id: lastInsertId(result) }, 201)
})

subcontractorRoutes.get('/:id', async (c) => {
  const sub = await queryOne<Record<string, unknown>>(c.env.DB,
    `SELECT s.*,
      (SELECT (COALESCE(c.criterion_1_verified,0)+COALESCE(c.criterion_2_verified,0)+COALESCE(c.criterion_3_verified,0)+
               COALESCE(c.criterion_4_verified,0)+COALESCE(c.criterion_5_verified,0)+COALESCE(c.criterion_6_verified,0)+
               COALESCE(c.criterion_7_verified,0)+COALESCE(c.criterion_8_verified,0)+COALESCE(c.criterion_9_verified,0)+
               COALESCE(c.criterion_10_verified,0)+COALESCE(c.criterion_11_verified,0)+COALESCE(c.criterion_12_verified,0)+
               COALESCE(c.criterion_13_verified,0)+COALESCE(c.criterion_14_verified,0))
       FROM subcontractor_mn_compliance c WHERE c.subcontractor_id = s.id) as verified_count
     FROM subcontractors s WHERE s.id = ?`,
    c.req.param('id'))
  if (!sub) return c.json({ error: 'Not found' }, 404)
  const bids = await queryAll(c.env.DB,
    `SELECT sb.*, p.project_number, p.name as project_name
     FROM subcontractor_bids sb
     LEFT JOIN projects p ON p.id = sb.project_id
     WHERE sb.subcontractor_id = ? ORDER BY sb.created_at DESC`,
    c.req.param('id')
  )
  const projects = await queryAll(c.env.DB,
    `SELECT sp.*, p.project_number, p.name, p.status as project_status
     FROM subcontractor_projects sp
     JOIN projects p ON p.id = sp.project_id
     WHERE sp.subcontractor_id = ? ORDER BY sp.created_at DESC`,
    c.req.param('id')
  )
  const docs = await queryAll(c.env.DB,
    `SELECT d.*, u.full_name as uploaded_by_name FROM documents d
     LEFT JOIN users u ON u.id = d.uploaded_by
     WHERE d.entity_type = 'subcontractor' AND d.entity_id = ?
     ORDER BY d.created_at DESC`,
    c.req.param('id')
  )
  return c.json({ ...sub as object, bids, projects, documents: docs })
})

subcontractorRoutes.put('/:id', zValidator('json', subSchema.partial()), async (c) => {
  const data = c.req.valid('json')
  const mapped = Object.fromEntries(
    Object.entries(data).map(([k, v]) =>
      ['w9_on_file', 'prequalified'].includes(k) ? [k, v ? 1 : 0] : [k, v]
    )
  )
  const fields = Object.keys(mapped).map(k => `${k} = ?`)
  if (!fields.length) return c.json({ error: 'Nothing to update' }, 400)
  fields.push('updated_at = datetime(\'now\')')
  await execute(c.env.DB, `UPDATE subcontractors SET ${fields.join(', ')} WHERE id = ?`,
    ...Object.values(mapped), c.req.param('id')
  )
  return c.json({ ok: true })
})

subcontractorRoutes.delete('/:id', async (c) => {
  await execute(c.env.DB, `UPDATE subcontractors SET status = 'inactive', updated_at = datetime('now') WHERE id = ?`, c.req.param('id'))
  return c.json({ ok: true })
})

// Bids
const bidSchema = z.object({
  project_id: z.number().optional(),
  estimate_id: z.number().optional(),
  trade_package: z.string().min(1),
  bid_amount: z.number().optional(),
  bid_date: z.string().optional(),
  bid_status: z.enum(['invited', 'received', 'leveled', 'awarded', 'rejected']).optional(),
  awarded_amount: z.number().optional(),
  awarded_date: z.string().optional(),
  notes: z.string().optional(),
})

subcontractorRoutes.get('/:id/bids', async (c) => {
  return c.json(await queryAll(c.env.DB,
    `SELECT sb.*, p.project_number, p.name as project_name
     FROM subcontractor_bids sb LEFT JOIN projects p ON p.id = sb.project_id
     WHERE sb.subcontractor_id = ? ORDER BY sb.created_at DESC`,
    c.req.param('id')
  ))
})

subcontractorRoutes.post('/:id/bids', zValidator('json', bidSchema), async (c) => {
  const data = c.req.valid('json')
  const user = c.get('user')
  const result = await execute(c.env.DB,
    `INSERT INTO subcontractor_bids (subcontractor_id, project_id, estimate_id, trade_package, bid_amount, bid_date, bid_status, awarded_amount, awarded_date, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    c.req.param('id'), data.project_id ?? null, data.estimate_id ?? null,
    data.trade_package, data.bid_amount ?? null,
    data.bid_date ?? new Date().toISOString().split('T')[0],
    data.bid_status ?? 'received', data.awarded_amount ?? null,
    data.awarded_date ?? null, data.notes ?? null, user.sub
  )
  // If awarded, create a subcontractor_projects record
  if (data.bid_status === 'awarded' && data.project_id) {
    await execute(c.env.DB,
      `INSERT OR IGNORE INTO subcontractor_projects (subcontractor_id, project_id, trade_package, contract_amount)
       VALUES (?, ?, ?, ?)`,
      c.req.param('id'), data.project_id, data.trade_package, data.awarded_amount ?? data.bid_amount ?? null
    )
  }
  return c.json({ id: lastInsertId(result) }, 201)
})

subcontractorRoutes.put('/:id/bids/:bid', zValidator('json', bidSchema.partial()), async (c) => {
  const data = c.req.valid('json')
  const fields = Object.keys(data).map(k => `${k} = ?`)
  if (!fields.length) return c.json({ error: 'Nothing to update' }, 400)
  fields.push('updated_at = datetime(\'now\')')
  await execute(c.env.DB, `UPDATE subcontractor_bids SET ${fields.join(', ')} WHERE id = ? AND subcontractor_id = ?`,
    ...Object.values(data), c.req.param('bid'), c.req.param('id')
  )
  return c.json({ ok: true })
})

subcontractorRoutes.delete('/:id/bids/:bid', async (c) => {
  await execute(c.env.DB, 'DELETE FROM subcontractor_bids WHERE id = ? AND subcontractor_id = ?',
    c.req.param('bid'), c.req.param('id')
  )
  return c.json({ ok: true })
})

// MN IC Compliance
const complianceSchema = z.object({
  entity_type: z.enum(['llc','corporation','sole_prop','partnership','other']).nullable().optional(),
  criterion_1_verified: z.boolean().optional(),
  criterion_1_notes: z.string().nullable().optional(),
  criterion_2_verified: z.boolean().optional(),
  criterion_2_notes: z.string().nullable().optional(),
  criterion_3_verified: z.boolean().optional(),
  criterion_3_notes: z.string().nullable().optional(),
  federal_ein: z.string().nullable().optional(),
  criterion_4_verified: z.boolean().optional(),
  criterion_4_notes: z.string().nullable().optional(),
  mn_tax_id: z.string().nullable().optional(),
  criterion_5_verified: z.boolean().optional(),
  criterion_5_notes: z.string().nullable().optional(),
  criterion_6_verified: z.boolean().optional(),
  criterion_6_notes: z.string().nullable().optional(),
  criterion_7_verified: z.boolean().optional(),
  criterion_7_notes: z.string().nullable().optional(),
  criterion_8_verified: z.boolean().optional(),
  criterion_8_notes: z.string().nullable().optional(),
  criterion_9_verified: z.boolean().optional(),
  criterion_9_notes: z.string().nullable().optional(),
  criterion_10_verified: z.boolean().optional(),
  criterion_10_notes: z.string().nullable().optional(),
  criterion_11_verified: z.boolean().optional(),
  criterion_11_notes: z.string().nullable().optional(),
  criterion_12_verified: z.boolean().optional(),
  criterion_12_notes: z.string().nullable().optional(),
  workers_comp_carrier: z.string().nullable().optional(),
  workers_comp_policy: z.string().nullable().optional(),
  workers_comp_expiry: z.string().nullable().optional(),
  criterion_13_verified: z.boolean().optional(),
  criterion_13_notes: z.string().nullable().optional(),
  criterion_14_verified: z.boolean().optional(),
  criterion_14_notes: z.string().nullable().optional(),
})

function computeVerifiedCount(row: Record<string, unknown>): number {
  let count = 0
  for (let i = 1; i <= 14; i++) {
    if (row[`criterion_${i}_verified`]) count++
  }
  return count
}

subcontractorRoutes.get('/:id/compliance', async (c) => {
  const subId = c.req.param('id')
  const row = await queryOne<Record<string, unknown>>(
    c.env.DB, 'SELECT * FROM subcontractor_mn_compliance WHERE subcontractor_id = ?', subId
  )
  if (!row) {
    // Return empty compliance record
    return c.json({ subcontractor_id: parseInt(subId), verified_count: 0 })
  }
  return c.json({ ...row, verified_count: computeVerifiedCount(row) })
})

subcontractorRoutes.put('/:id/compliance', zValidator('json', complianceSchema), async (c) => {
  const subId = c.req.param('id')
  const data = c.req.valid('json')
  const user = c.get('user')

  // Convert boolean fields to 0/1 for SQLite
  const mapped: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (k.endsWith('_verified')) {
      mapped[k] = v ? 1 : 0
    } else {
      mapped[k] = v ?? null
    }
  }

  const existing = await queryOne(
    c.env.DB, 'SELECT id FROM subcontractor_mn_compliance WHERE subcontractor_id = ?', subId
  )

  if (!existing) {
    // Insert
    const cols = ['subcontractor_id', 'last_reviewed_at', 'last_reviewed_by', ...Object.keys(mapped)]
    const placeholders = cols.map(() => '?').join(', ')
    await execute(c.env.DB,
      `INSERT INTO subcontractor_mn_compliance (${cols.join(', ')}) VALUES (${placeholders})`,
      subId, new Date().toISOString(), user.sub, ...Object.values(mapped)
    )
  } else {
    // Update
    const fields = [...Object.keys(mapped).map(k => `${k} = ?`), 'last_reviewed_at = ?', 'last_reviewed_by = ?', 'updated_at = datetime(\'now\')']
    await execute(c.env.DB,
      `UPDATE subcontractor_mn_compliance SET ${fields.join(', ')} WHERE subcontractor_id = ?`,
      ...Object.values(mapped), new Date().toISOString(), user.sub, subId
    )
  }

  // Return updated record
  const updated = await queryOne<Record<string, unknown>>(
    c.env.DB, 'SELECT * FROM subcontractor_mn_compliance WHERE subcontractor_id = ?', subId
  )
  return c.json({ ...updated, verified_count: updated ? computeVerifiedCount(updated) : 0 })
})
