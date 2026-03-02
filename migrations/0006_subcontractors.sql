-- Migration 0006: Subcontractors, Bids, Project Assignments

CREATE TABLE IF NOT EXISTS subcontractors (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name      TEXT NOT NULL,
  trade             TEXT NOT NULL CHECK (trade IN ('electrical', 'plumbing', 'hvac', 'framing', 'drywall', 'flooring', 'painting', 'roofing', 'concrete', 'steel', 'glass_glazing', 'elevator', 'fire_protection', 'low_voltage', 'landscaping', 'demolition', 'general', 'other')),
  additional_trades TEXT,
  contact_name      TEXT,
  contact_email     TEXT,
  contact_phone     TEXT,
  address           TEXT,
  city              TEXT,
  state             TEXT DEFAULT 'MN',
  zip               TEXT,
  website           TEXT,
  license_number    TEXT,
  license_state     TEXT DEFAULT 'MN',
  license_expiry    TEXT,
  insurance_carrier TEXT,
  insurance_policy  TEXT,
  insurance_expiry  TEXT,
  insurance_amount  REAL,
  w9_on_file        INTEGER NOT NULL DEFAULT 0,
  prequalified      INTEGER NOT NULL DEFAULT 0,
  rating            INTEGER CHECK (rating >= 1 AND rating <= 5),
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'do_not_use')),
  notes             TEXT,
  created_by        INTEGER REFERENCES users(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subcontractor_bids (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  subcontractor_id  INTEGER NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  project_id        INTEGER REFERENCES projects(id),
  estimate_id       INTEGER REFERENCES estimates(id),
  trade_package     TEXT NOT NULL,
  bid_amount        REAL,
  bid_date          TEXT,
  bid_status        TEXT NOT NULL DEFAULT 'received' CHECK (bid_status IN ('invited', 'received', 'leveled', 'awarded', 'rejected')),
  awarded_amount    REAL,
  awarded_date      TEXT,
  notes             TEXT,
  created_by        INTEGER REFERENCES users(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subcontractor_projects (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  subcontractor_id  INTEGER NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  project_id        INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  trade_package     TEXT,
  contract_amount   REAL,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'complete', 'terminated')),
  start_date        TEXT,
  end_date          TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(subcontractor_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_subs_trade ON subcontractors(trade);
CREATE INDEX IF NOT EXISTS idx_subs_status ON subcontractors(status);
CREATE INDEX IF NOT EXISTS idx_sub_bids_sub ON subcontractor_bids(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_sub_bids_project ON subcontractor_bids(project_id);
CREATE INDEX IF NOT EXISTS idx_sub_projects_sub ON subcontractor_projects(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_sub_projects_project ON subcontractor_projects(project_id);
