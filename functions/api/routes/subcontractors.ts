import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { queryAll, queryOne, execute, lastInsertId } from '../lib/db'
import type { Env } from '../[[route]]'

export const subcontractorRoutes = new Hono<{ Bindings: Env }>()

const TRADES = ['electrical', 'plumbing', 'hvac', 'framing', 'drywall', 'flooring', 'painting',
  'roofing', 'concrete', 'steel', 'glass_glazing', 'elevator', 'fire_protection',
  'low_voltage', 'landscaping', 'demolition', 'general', 'other'] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VERIFIED_COUNT_SUBQUERY = `(SELECT (
  COALESCE(c.criterion_1_verified,0)+COALESCE(c.criterion_2_verified,0)+COALESCE(c.criterion_3_verified,0)+
  COALESCE(c.criterion_4_verified,0)+COALESCE(c.criterion_5_verified,0)+COALESCE(c.criterion_6_verified,0)+
  COALESCE(c.criterion_7_verified,0)+COALESCE(c.criterion_8_verified,0)+COALESCE(c.criterion_9_verified,0)+
  COALESCE(c.criterion_10_verified,0)+COALESCE(c.criterion_11_verified,0)+COALESCE(c.criterion_12_verified,0)+
  COALESCE(c.criterion_13_verified,0)+COALESCE(c.criterion_14_verified,0))
FROM subcontractor_mn_compliance c WHERE c.subcontractor_id = s.id)`

// ─── Subcontractor CRUD ───────────────────────────────────────────────────────

const subSchema = z.object({
  company_name: z.string().min(1),
  dba_name: z.string().nullable().optional(),
  business_structure: z.enum(['sole_prop','llc','corporation','partnership']).nullable().optional(),
  state_of_registration: z.string().nullable().optional(),
  mn_sos_number: z.string().nullable().optional(),
  business_start_date: z.string().nullable().optional(),
  trade: z.enum(TRADES),
  additional_trades: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  mailing_address: z.string().nullable().optional(),
  mailing_city: z.string().nullable().optional(),
  mailing_state: z.string().nullable().optional(),
  mailing_zip: z.string().nullable().optional(),
  business_phone: z.string().nullable().optional(),
  business_email: z.string().email().nullable().optional().or(z.literal('')),
  website: z.string().url().nullable().optional().or(z.literal('')),
  // Legacy contact
  contact_name: z.string().nullable().optional(),
  contact_email: z.string().email().nullable().optional().or(z.literal('')),
  contact_phone: z.string().nullable().optional(),
  // Tax
  federal_ein: z.string().nullable().optional(),
  w9_on_file: z.boolean().optional(),
  mn_tax_id: z.string().nullable().optional(),
  mn_withholding_account: z.string().nullable().optional(),
  irs_1099_eligible: z.boolean().optional(),
  // Operational independence
  provides_own_tools: z.boolean().optional(),
  provides_own_materials: z.boolean().optional(),
  provides_own_equipment: z.boolean().optional(),
  responsible_for_labor: z.boolean().optional(),
  can_hire_employees: z.boolean().optional(),
  advertises_to_public: z.boolean().optional(),
  has_multiple_clients: z.boolean().optional(),
  maintains_separate_location: z.boolean().optional(),
  can_realize_profit_loss: z.boolean().optional(),
  // Payment
  vendor_id: z.string().nullable().optional(),
  payment_method: z.enum(['check','ach','wire','credit_card','other']).nullable().optional(),
  requires_1099: z.boolean().optional(),
  date_1099_issued: z.string().nullable().optional(),
  accounting_system_ref: z.string().nullable().optional(),
  // Risk
  compliance_score: z.number().nullable().optional(),
  risk_level: z.enum(['low','medium','high']).nullable().optional(),
  // Legacy
  license_number: z.string().nullable().optional(),
  license_state: z.string().nullable().optional(),
  license_expiry: z.string().nullable().optional(),
  insurance_carrier: z.string().nullable().optional(),
  insurance_policy: z.string().nullable().optional(),
  insurance_expiry: z.string().nullable().optional(),
  insurance_amount: z.number().nullable().optional(),
  prequalified: z.boolean().optional(),
  rating: z.number().min(1).max(5).nullable().optional(),
  status: z.enum(['active','inactive','do_not_use']).optional(),
  notes: z.string().nullable().optional(),
})

const BOOL_FIELDS = ['w9_on_file','prequalified','irs_1099_eligible','requires_1099',
  'provides_own_tools','provides_own_materials','provides_own_equipment','responsible_for_labor',
  'can_hire_employees','advertises_to_public','has_multiple_clients','maintains_separate_location',
  'can_realize_profit_loss']

function mapBools(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => BOOL_FIELDS.includes(k) ? [k, v ? 1 : 0] : [k, v])
  )
}

subcontractorRoutes.get('/', async (c) => {
  const { trade, status, search } = c.req.query()
  let sql = `SELECT s.*, ${VERIFIED_COUNT_SUBQUERY} as verified_count FROM subcontractors s WHERE 1=1`
  const params: unknown[] = []
  if (trade) { sql += ' AND s.trade = ?'; params.push(trade) }
  if (status) { sql += ' AND s.status = ?'; params.push(status) }
  if (search) { sql += ' AND (s.company_name LIKE ? OR s.contact_name LIKE ? OR s.business_email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
  sql += ' ORDER BY s.company_name'
  return c.json(await queryAll(c.env.DB, sql, ...params))
})

subcontractorRoutes.post('/', zValidator('json', subSchema), async (c) => {
  const raw = c.req.valid('json')
  const data = mapBools(raw as Record<string, unknown>)
  const user = c.get('user')
  const result = await execute(c.env.DB,
    `INSERT INTO subcontractors (
      company_name, dba_name, business_structure, state_of_registration, mn_sos_number, business_start_date,
      trade, additional_trades, address, city, state, zip,
      mailing_address, mailing_city, mailing_state, mailing_zip,
      business_phone, business_email, website,
      contact_name, contact_email, contact_phone,
      federal_ein, w9_on_file, mn_tax_id, mn_withholding_account, irs_1099_eligible,
      provides_own_tools, provides_own_materials, provides_own_equipment, responsible_for_labor,
      can_hire_employees, advertises_to_public, has_multiple_clients, maintains_separate_location, can_realize_profit_loss,
      vendor_id, payment_method, requires_1099, date_1099_issued, accounting_system_ref,
      risk_level, license_number, license_state, license_expiry,
      insurance_carrier, insurance_policy, insurance_expiry, insurance_amount,
      prequalified, rating, status, notes, created_by
    ) VALUES (
      ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
    )`,
    data.company_name ?? null, data.dba_name ?? null, data.business_structure ?? null,
    data.state_of_registration ?? 'MN', data.mn_sos_number ?? null, data.business_start_date ?? null,
    data.trade, data.additional_trades ?? null,
    data.address ?? null, data.city ?? null, data.state ?? 'MN', data.zip ?? null,
    data.mailing_address ?? null, data.mailing_city ?? null, data.mailing_state ?? null, data.mailing_zip ?? null,
    data.business_phone ?? null, data.business_email ?? null, data.website ?? null,
    data.contact_name ?? null, data.contact_email ?? null, data.contact_phone ?? null,
    data.federal_ein ?? null, data.w9_on_file ?? 0, data.mn_tax_id ?? null,
    data.mn_withholding_account ?? null, data.irs_1099_eligible ?? 1,
    data.provides_own_tools ?? 0, data.provides_own_materials ?? 0, data.provides_own_equipment ?? 0,
    data.responsible_for_labor ?? 0, data.can_hire_employees ?? 0, data.advertises_to_public ?? 0,
    data.has_multiple_clients ?? 0, data.maintains_separate_location ?? 0, data.can_realize_profit_loss ?? 0,
    data.vendor_id ?? null, data.payment_method ?? null, data.requires_1099 ?? 1,
    data.date_1099_issued ?? null, data.accounting_system_ref ?? null,
    data.risk_level ?? null,
    data.license_number ?? null, data.license_state ?? 'MN', data.license_expiry ?? null,
    data.insurance_carrier ?? null, data.insurance_policy ?? null, data.insurance_expiry ?? null, data.insurance_amount ?? null,
    data.prequalified ?? 0, data.rating ?? null, data.status ?? 'active', data.notes ?? null, user.sub
  )
  return c.json({ id: lastInsertId(result) }, 201)
})

subcontractorRoutes.get('/:id', async (c) => {
  const subId = c.req.param('id')
  const sub = await queryOne<Record<string, unknown>>(c.env.DB,
    `SELECT s.*, ${VERIFIED_COUNT_SUBQUERY} as verified_count FROM subcontractors s WHERE s.id = ?`,
    subId)
  if (!sub) return c.json({ error: 'Not found' }, 404)
  const [bids, projects, docs, owners, licenses, insurance, contracts] = await Promise.all([
    queryAll(c.env.DB,
      `SELECT sb.*, p.project_number, p.name as project_name FROM subcontractor_bids sb
       LEFT JOIN projects p ON p.id = sb.project_id WHERE sb.subcontractor_id = ? ORDER BY sb.created_at DESC`, subId),
    queryAll(c.env.DB,
      `SELECT sp.*, p.project_number, p.name, p.status as project_status FROM subcontractor_projects sp
       JOIN projects p ON p.id = sp.project_id WHERE sp.subcontractor_id = ? ORDER BY sp.created_at DESC`, subId),
    queryAll(c.env.DB,
      `SELECT d.*, u.full_name as uploaded_by_name FROM documents d LEFT JOIN users u ON u.id = d.uploaded_by
       WHERE d.entity_type = 'subcontractor' AND d.entity_id = ? ORDER BY d.created_at DESC`, subId),
    queryAll(c.env.DB, 'SELECT * FROM subcontractor_owners WHERE subcontractor_id = ? ORDER BY is_primary DESC, owner_name', subId),
    queryAll(c.env.DB, 'SELECT * FROM subcontractor_licenses WHERE subcontractor_id = ? ORDER BY is_primary DESC, expiration_date', subId),
    queryAll(c.env.DB, 'SELECT * FROM subcontractor_insurance_policies WHERE subcontractor_id = ? ORDER BY policy_type', subId),
    queryAll(c.env.DB,
      `SELECT sc.*, p.project_number, p.name as project_name FROM subcontractor_contracts sc
       LEFT JOIN projects p ON p.id = sc.project_id WHERE sc.subcontractor_id = ? ORDER BY sc.created_at DESC`, subId),
  ])
  return c.json({ ...sub, bids, projects, documents: docs, owners, licenses, insurance_policies: insurance, contracts })
})

subcontractorRoutes.put('/:id', zValidator('json', subSchema.partial()), async (c) => {
  const raw = c.req.valid('json')
  const data = mapBools(raw as Record<string, unknown>)
  const fields = Object.keys(data).map(k => `${k} = ?`)
  if (!fields.length) return c.json({ error: 'Nothing to update' }, 400)
  fields.push("updated_at = datetime('now')")
  await execute(c.env.DB, `UPDATE subcontractors SET ${fields.join(', ')} WHERE id = ?`,
    ...Object.values(data), c.req.param('id'))
  return c.json({ ok: true })
})

subcontractorRoutes.delete('/:id', async (c) => {
  await execute(c.env.DB, `UPDATE subcontractors SET status = 'inactive', updated_at = datetime('now') WHERE id = ?`, c.req.param('id'))
  return c.json({ ok: true })
})

// ─── Owners ──────────────────────────────────────────────────────────────────

const ownerSchema = z.object({
  owner_name: z.string().min(1),
  title: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  ownership_pct: z.number().min(0).max(100).nullable().optional(),
  ssn_last4: z.string().max(4).nullable().optional(),
  is_primary: z.boolean().optional(),
})

subcontractorRoutes.get('/:id/owners', async (c) => {
  return c.json(await queryAll(c.env.DB,
    'SELECT * FROM subcontractor_owners WHERE subcontractor_id = ? ORDER BY is_primary DESC, owner_name',
    c.req.param('id')))
})

subcontractorRoutes.post('/:id/owners', zValidator('json', ownerSchema), async (c) => {
  const data = c.req.valid('json')
  const subId = c.req.param('id')
  if (data.is_primary) {
    await execute(c.env.DB, 'UPDATE subcontractor_owners SET is_primary = 0 WHERE subcontractor_id = ?', subId)
  }
  const result = await execute(c.env.DB,
    `INSERT INTO subcontractor_owners (subcontractor_id, owner_name, title, address, city, state, zip, phone, email, ownership_pct, ssn_last4, is_primary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    subId, data.owner_name, data.title ?? null, data.address ?? null, data.city ?? null,
    data.state ?? null, data.zip ?? null, data.phone ?? null, data.email ?? null,
    data.ownership_pct ?? null, data.ssn_last4 ?? null, data.is_primary ? 1 : 0)
  return c.json({ id: lastInsertId(result) }, 201)
})

subcontractorRoutes.put('/:id/owners/:oid', zValidator('json', ownerSchema.partial()), async (c) => {
  const data = c.req.valid('json')
  const subId = c.req.param('id')
  if (data.is_primary) {
    await execute(c.env.DB, 'UPDATE subcontractor_owners SET is_primary = 0 WHERE subcontractor_id = ?', subId)
  }
  const mapped = { ...data, ...(data.is_primary !== undefined ? { is_primary: data.is_primary ? 1 : 0 } : {}) }
  const fields = Object.keys(mapped).map(k => `${k} = ?`)
  if (!fields.length) return c.json({ error: 'Nothing to update' }, 400)
  fields.push("updated_at = datetime('now')")
  await execute(c.env.DB, `UPDATE subcontractor_owners SET ${fields.join(', ')} WHERE id = ? AND subcontractor_id = ?`,
    ...Object.values(mapped), c.req.param('oid'), subId)
  return c.json({ ok: true })
})

subcontractorRoutes.delete('/:id/owners/:oid', async (c) => {
  await execute(c.env.DB, 'DELETE FROM subcontractor_owners WHERE id = ? AND subcontractor_id = ?',
    c.req.param('oid'), c.req.param('id'))
  return c.json({ ok: true })
})

// ─── Licenses ─────────────────────────────────────────────────────────────────

const licenseSchema = z.object({
  license_type: z.enum(['general_contractor','electrical','plumbing','hvac','dli','other']),
  license_number: z.string().min(1),
  issuing_authority: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  expiration_date: z.string().nullable().optional(),
  specialty_trade: z.string().nullable().optional(),
  is_primary: z.boolean().optional(),
  notes: z.string().nullable().optional(),
})

subcontractorRoutes.get('/:id/licenses', async (c) => {
  return c.json(await queryAll(c.env.DB,
    'SELECT * FROM subcontractor_licenses WHERE subcontractor_id = ? ORDER BY is_primary DESC, expiration_date',
    c.req.param('id')))
})

subcontractorRoutes.post('/:id/licenses', zValidator('json', licenseSchema), async (c) => {
  const data = c.req.valid('json')
  const subId = c.req.param('id')
  if (data.is_primary) {
    await execute(c.env.DB, 'UPDATE subcontractor_licenses SET is_primary = 0 WHERE subcontractor_id = ?', subId)
  }
  const result = await execute(c.env.DB,
    `INSERT INTO subcontractor_licenses (subcontractor_id, license_type, license_number, issuing_authority, state, expiration_date, specialty_trade, is_primary, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    subId, data.license_type, data.license_number, data.issuing_authority ?? null,
    data.state ?? 'MN', data.expiration_date ?? null, data.specialty_trade ?? null,
    data.is_primary ? 1 : 0, data.notes ?? null)
  return c.json({ id: lastInsertId(result) }, 201)
})

subcontractorRoutes.put('/:id/licenses/:lid', zValidator('json', licenseSchema.partial()), async (c) => {
  const data = c.req.valid('json')
  const subId = c.req.param('id')
  if (data.is_primary) {
    await execute(c.env.DB, 'UPDATE subcontractor_licenses SET is_primary = 0 WHERE subcontractor_id = ?', subId)
  }
  const mapped = { ...data, ...(data.is_primary !== undefined ? { is_primary: data.is_primary ? 1 : 0 } : {}) }
  const fields = Object.keys(mapped).map(k => `${k} = ?`)
  if (!fields.length) return c.json({ error: 'Nothing to update' }, 400)
  fields.push("updated_at = datetime('now')")
  await execute(c.env.DB, `UPDATE subcontractor_licenses SET ${fields.join(', ')} WHERE id = ? AND subcontractor_id = ?`,
    ...Object.values(mapped), c.req.param('lid'), subId)
  return c.json({ ok: true })
})

subcontractorRoutes.delete('/:id/licenses/:lid', async (c) => {
  await execute(c.env.DB, 'DELETE FROM subcontractor_licenses WHERE id = ? AND subcontractor_id = ?',
    c.req.param('lid'), c.req.param('id'))
  return c.json({ ok: true })
})

// ─── Insurance Policies ───────────────────────────────────────────────────────

const insuranceSchema = z.object({
  policy_type: z.enum(['general_liability','workers_comp','commercial_auto','umbrella','builders_risk','other']),
  carrier: z.string().min(1),
  policy_number: z.string().nullable().optional(),
  coverage_amount: z.number().nullable().optional(),
  effective_date: z.string().nullable().optional(),
  expiration_date: z.string().nullable().optional(),
  num_employees_covered: z.number().int().nullable().optional(),
  is_exempt: z.boolean().optional(),
  exempt_reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

subcontractorRoutes.get('/:id/insurance', async (c) => {
  return c.json(await queryAll(c.env.DB,
    'SELECT * FROM subcontractor_insurance_policies WHERE subcontractor_id = ? ORDER BY policy_type',
    c.req.param('id')))
})

subcontractorRoutes.post('/:id/insurance', zValidator('json', insuranceSchema), async (c) => {
  const data = c.req.valid('json')
  const result = await execute(c.env.DB,
    `INSERT INTO subcontractor_insurance_policies (subcontractor_id, policy_type, carrier, policy_number, coverage_amount, effective_date, expiration_date, num_employees_covered, is_exempt, exempt_reason, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    c.req.param('id'), data.policy_type, data.carrier, data.policy_number ?? null,
    data.coverage_amount ?? null, data.effective_date ?? null, data.expiration_date ?? null,
    data.num_employees_covered ?? null, data.is_exempt ? 1 : 0, data.exempt_reason ?? null, data.notes ?? null)
  return c.json({ id: lastInsertId(result) }, 201)
})

subcontractorRoutes.put('/:id/insurance/:pid', zValidator('json', insuranceSchema.partial()), async (c) => {
  const data = c.req.valid('json')
  const mapped = { ...data, ...(data.is_exempt !== undefined ? { is_exempt: data.is_exempt ? 1 : 0 } : {}) }
  const fields = Object.keys(mapped).map(k => `${k} = ?`)
  if (!fields.length) return c.json({ error: 'Nothing to update' }, 400)
  fields.push("updated_at = datetime('now')")
  await execute(c.env.DB, `UPDATE subcontractor_insurance_policies SET ${fields.join(', ')} WHERE id = ? AND subcontractor_id = ?`,
    ...Object.values(mapped), c.req.param('pid'), c.req.param('id'))
  return c.json({ ok: true })
})

subcontractorRoutes.delete('/:id/insurance/:pid', async (c) => {
  await execute(c.env.DB, 'DELETE FROM subcontractor_insurance_policies WHERE id = ? AND subcontractor_id = ?',
    c.req.param('pid'), c.req.param('id'))
  return c.json({ ok: true })
})

// ─── Contracts ────────────────────────────────────────────────────────────────

const contractSchema = z.object({
  contract_title: z.string().min(1),
  project_id: z.number().nullable().optional(),
  scope_of_work: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  payment_terms: z.enum(['lump_sum','unit_price','time_materials']).nullable().optional(),
  contract_value: z.number().nullable().optional(),
  responsible_for_completion: z.boolean().optional(),
  written_contract_on_file: z.boolean().optional(),
  status: z.enum(['draft','active','complete','terminated']).optional(),
  notes: z.string().nullable().optional(),
})

subcontractorRoutes.get('/:id/contracts', async (c) => {
  return c.json(await queryAll(c.env.DB,
    `SELECT sc.*, p.project_number, p.name as project_name FROM subcontractor_contracts sc
     LEFT JOIN projects p ON p.id = sc.project_id WHERE sc.subcontractor_id = ? ORDER BY sc.created_at DESC`,
    c.req.param('id')))
})

subcontractorRoutes.post('/:id/contracts', zValidator('json', contractSchema), async (c) => {
  const data = c.req.valid('json')
  const user = c.get('user')
  const result = await execute(c.env.DB,
    `INSERT INTO subcontractor_contracts (subcontractor_id, project_id, contract_title, scope_of_work, start_date, end_date, payment_terms, contract_value, responsible_for_completion, written_contract_on_file, status, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    c.req.param('id'), data.project_id ?? null, data.contract_title,
    data.scope_of_work ?? null, data.start_date ?? null, data.end_date ?? null,
    data.payment_terms ?? null, data.contract_value ?? null,
    data.responsible_for_completion ? 1 : 0, data.written_contract_on_file ? 1 : 0,
    data.status ?? 'active', data.notes ?? null, user.sub)
  return c.json({ id: lastInsertId(result) }, 201)
})

subcontractorRoutes.put('/:id/contracts/:cid', zValidator('json', contractSchema.partial()), async (c) => {
  const data = c.req.valid('json')
  const mapped = {
    ...data,
    ...(data.responsible_for_completion !== undefined ? { responsible_for_completion: data.responsible_for_completion ? 1 : 0 } : {}),
    ...(data.written_contract_on_file !== undefined ? { written_contract_on_file: data.written_contract_on_file ? 1 : 0 } : {}),
  }
  const fields = Object.keys(mapped).map(k => `${k} = ?`)
  if (!fields.length) return c.json({ error: 'Nothing to update' }, 400)
  fields.push("updated_at = datetime('now')")
  await execute(c.env.DB, `UPDATE subcontractor_contracts SET ${fields.join(', ')} WHERE id = ? AND subcontractor_id = ?`,
    ...Object.values(mapped), c.req.param('cid'), c.req.param('id'))
  return c.json({ ok: true })
})

subcontractorRoutes.delete('/:id/contracts/:cid', async (c) => {
  await execute(c.env.DB, 'DELETE FROM subcontractor_contracts WHERE id = ? AND subcontractor_id = ?',
    c.req.param('cid'), c.req.param('id'))
  return c.json({ ok: true })
})

// ─── Bids ─────────────────────────────────────────────────────────────────────

const bidSchema = z.object({
  project_id: z.number().optional(),
  estimate_id: z.number().optional(),
  trade_package: z.string().min(1),
  bid_amount: z.number().optional(),
  bid_date: z.string().optional(),
  bid_status: z.enum(['invited','received','leveled','awarded','rejected']).optional(),
  awarded_amount: z.number().optional(),
  awarded_date: z.string().optional(),
  notes: z.string().optional(),
})

subcontractorRoutes.get('/:id/bids', async (c) => {
  return c.json(await queryAll(c.env.DB,
    `SELECT sb.*, p.project_number, p.name as project_name FROM subcontractor_bids sb
     LEFT JOIN projects p ON p.id = sb.project_id WHERE sb.subcontractor_id = ? ORDER BY sb.created_at DESC`,
    c.req.param('id')))
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
    data.awarded_date ?? null, data.notes ?? null, user.sub)
  if (data.bid_status === 'awarded' && data.project_id) {
    await execute(c.env.DB,
      `INSERT OR IGNORE INTO subcontractor_projects (subcontractor_id, project_id, trade_package, contract_amount)
       VALUES (?, ?, ?, ?)`,
      c.req.param('id'), data.project_id, data.trade_package, data.awarded_amount ?? data.bid_amount ?? null)
  }
  return c.json({ id: lastInsertId(result) }, 201)
})

subcontractorRoutes.put('/:id/bids/:bid', zValidator('json', bidSchema.partial()), async (c) => {
  const data = c.req.valid('json')
  const fields = Object.keys(data).map(k => `${k} = ?`)
  if (!fields.length) return c.json({ error: 'Nothing to update' }, 400)
  fields.push("updated_at = datetime('now')")
  await execute(c.env.DB, `UPDATE subcontractor_bids SET ${fields.join(', ')} WHERE id = ? AND subcontractor_id = ?`,
    ...Object.values(data), c.req.param('bid'), c.req.param('id'))
  return c.json({ ok: true })
})

subcontractorRoutes.delete('/:id/bids/:bid', async (c) => {
  await execute(c.env.DB, 'DELETE FROM subcontractor_bids WHERE id = ? AND subcontractor_id = ?',
    c.req.param('bid'), c.req.param('id'))
  return c.json({ ok: true })
})

// ─── MN IC Compliance ─────────────────────────────────────────────────────────

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
    c.env.DB, 'SELECT * FROM subcontractor_mn_compliance WHERE subcontractor_id = ?', subId)
  if (!row) return c.json({ subcontractor_id: parseInt(subId), verified_count: 0 })
  return c.json({ ...row, verified_count: computeVerifiedCount(row) })
})

subcontractorRoutes.put('/:id/compliance', zValidator('json', complianceSchema), async (c) => {
  const subId = c.req.param('id')
  const data = c.req.valid('json')
  const user = c.get('user')
  const mapped: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (k.endsWith('_verified')) { mapped[k] = v ? 1 : 0 } else { mapped[k] = v ?? null }
  }
  const existing = await queryOne(c.env.DB, 'SELECT id FROM subcontractor_mn_compliance WHERE subcontractor_id = ?', subId)
  if (!existing) {
    const cols = ['subcontractor_id', 'last_reviewed_at', 'last_reviewed_by', ...Object.keys(mapped)]
    await execute(c.env.DB,
      `INSERT INTO subcontractor_mn_compliance (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      subId, new Date().toISOString(), user.sub, ...Object.values(mapped))
  } else {
    const fields = [...Object.keys(mapped).map(k => `${k} = ?`), 'last_reviewed_at = ?', 'last_reviewed_by = ?', "updated_at = datetime('now')"]
    await execute(c.env.DB,
      `UPDATE subcontractor_mn_compliance SET ${fields.join(', ')} WHERE subcontractor_id = ?`,
      ...Object.values(mapped), new Date().toISOString(), user.sub, subId)
  }
  // Also update compliance_score and risk_level on main table
  const updated = await queryOne<Record<string, unknown>>(c.env.DB, 'SELECT * FROM subcontractor_mn_compliance WHERE subcontractor_id = ?', subId)
  const score = updated ? computeVerifiedCount(updated) : 0
  const riskLevel = score === 14 ? 'low' : score >= 10 ? 'medium' : 'high'
  await execute(c.env.DB, "UPDATE subcontractors SET compliance_score = ?, risk_level = ?, updated_at = datetime('now') WHERE id = ?", score, riskLevel, subId)
  return c.json({ ...(updated ?? {}), verified_count: score })
})
