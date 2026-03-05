-- Migration 0008: Subcontractor Module Redesign
-- Expands the subcontractors table and adds 4 new related tables.
-- All existing data is preserved — only additive changes (ALTER TABLE ADD COLUMN, CREATE TABLE).

-- ─── Expand subcontractors main table ─────────────────────────────────────────

-- Business Identity
ALTER TABLE subcontractors ADD COLUMN dba_name TEXT;
ALTER TABLE subcontractors ADD COLUMN business_structure TEXT CHECK (business_structure IN ('sole_prop','llc','corporation','partnership'));
ALTER TABLE subcontractors ADD COLUMN state_of_registration TEXT DEFAULT 'MN';
ALTER TABLE subcontractors ADD COLUMN mn_sos_number TEXT;
ALTER TABLE subcontractors ADD COLUMN business_start_date TEXT;
ALTER TABLE subcontractors ADD COLUMN mailing_address TEXT;
ALTER TABLE subcontractors ADD COLUMN mailing_city TEXT;
ALTER TABLE subcontractors ADD COLUMN mailing_state TEXT;
ALTER TABLE subcontractors ADD COLUMN mailing_zip TEXT;
ALTER TABLE subcontractors ADD COLUMN business_phone TEXT;
ALTER TABLE subcontractors ADD COLUMN business_email TEXT;

-- Tax Compliance
ALTER TABLE subcontractors ADD COLUMN federal_ein TEXT;
ALTER TABLE subcontractors ADD COLUMN mn_tax_id TEXT;
ALTER TABLE subcontractors ADD COLUMN mn_withholding_account TEXT;
ALTER TABLE subcontractors ADD COLUMN irs_1099_eligible INTEGER NOT NULL DEFAULT 1;

-- Operational Independence Flags
ALTER TABLE subcontractors ADD COLUMN provides_own_tools INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subcontractors ADD COLUMN provides_own_materials INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subcontractors ADD COLUMN provides_own_equipment INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subcontractors ADD COLUMN responsible_for_labor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subcontractors ADD COLUMN can_hire_employees INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subcontractors ADD COLUMN advertises_to_public INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subcontractors ADD COLUMN has_multiple_clients INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subcontractors ADD COLUMN maintains_separate_location INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subcontractors ADD COLUMN can_realize_profit_loss INTEGER NOT NULL DEFAULT 0;

-- Payment Reporting
ALTER TABLE subcontractors ADD COLUMN vendor_id TEXT;
ALTER TABLE subcontractors ADD COLUMN payment_method TEXT CHECK (payment_method IN ('check','ach','wire','credit_card','other'));
ALTER TABLE subcontractors ADD COLUMN requires_1099 INTEGER NOT NULL DEFAULT 1;
ALTER TABLE subcontractors ADD COLUMN date_1099_issued TEXT;
ALTER TABLE subcontractors ADD COLUMN accounting_system_ref TEXT;

-- Risk
ALTER TABLE subcontractors ADD COLUMN compliance_score INTEGER;
ALTER TABLE subcontractors ADD COLUMN risk_level TEXT CHECK (risk_level IN ('low','medium','high'));

-- ─── New table: subcontractor_owners ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subcontractor_owners (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  subcontractor_id INTEGER NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  owner_name       TEXT NOT NULL,
  title            TEXT,
  address          TEXT,
  city             TEXT,
  state            TEXT,
  zip              TEXT,
  phone            TEXT,
  email            TEXT,
  ownership_pct    REAL,
  ssn_last4        TEXT,
  is_primary       INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── New table: subcontractor_licenses ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subcontractor_licenses (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  subcontractor_id INTEGER NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  license_type     TEXT NOT NULL DEFAULT 'general_contractor'
                   CHECK (license_type IN ('general_contractor','electrical','plumbing','hvac','dli','other')),
  license_number   TEXT NOT NULL,
  issuing_authority TEXT,
  state            TEXT DEFAULT 'MN',
  expiration_date  TEXT,
  specialty_trade  TEXT,
  is_primary       INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── New table: subcontractor_insurance_policies ──────────────────────────────

CREATE TABLE IF NOT EXISTS subcontractor_insurance_policies (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  subcontractor_id     INTEGER NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  policy_type          TEXT NOT NULL
                       CHECK (policy_type IN ('general_liability','workers_comp','commercial_auto','umbrella','builders_risk','other')),
  carrier              TEXT NOT NULL,
  policy_number        TEXT,
  coverage_amount      REAL,
  effective_date       TEXT,
  expiration_date      TEXT,
  num_employees_covered INTEGER,
  is_exempt            INTEGER NOT NULL DEFAULT 0,
  exempt_reason        TEXT,
  notes                TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── New table: subcontractor_contracts ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS subcontractor_contracts (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  subcontractor_id          INTEGER NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  project_id                INTEGER REFERENCES projects(id),
  contract_title            TEXT NOT NULL,
  scope_of_work             TEXT,
  start_date                TEXT,
  end_date                  TEXT,
  payment_terms             TEXT CHECK (payment_terms IN ('lump_sum','unit_price','time_materials')),
  contract_value            REAL,
  responsible_for_completion INTEGER NOT NULL DEFAULT 0,
  written_contract_on_file  INTEGER NOT NULL DEFAULT 0,
  status                    TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('draft','active','complete','terminated')),
  notes                     TEXT,
  created_by                INTEGER REFERENCES users(id),
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sub_owners     ON subcontractor_owners(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_sub_licenses   ON subcontractor_licenses(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_sub_insurance  ON subcontractor_insurance_policies(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_sub_contracts  ON subcontractor_contracts(subcontractor_id);
