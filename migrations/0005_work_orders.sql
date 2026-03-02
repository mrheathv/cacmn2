-- Migration 0005: Work Orders & Documents

CREATE TABLE IF NOT EXISTS work_orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  wo_number       TEXT NOT NULL UNIQUE,
  project_id      INTEGER REFERENCES projects(id),
  client_id       INTEGER REFERENCES clients(id),
  contact_id      INTEGER REFERENCES contacts(id),
  title           TEXT NOT NULL,
  description     TEXT,
  scope_of_work   TEXT,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'in_progress', 'pending_approval', 'complete', 'cancelled')),
  priority        TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  wo_type         TEXT CHECK (wo_type IN ('change_order', 'service', 'warranty', 'standard', 'repair')),
  scheduled_date  TEXT,
  due_date        TEXT,
  completed_date  TEXT,
  estimated_cost  REAL,
  actual_cost     REAL,
  assigned_to     INTEGER REFERENCES users(id),
  approved_by     INTEGER REFERENCES users(id),
  approved_at     TEXT,
  notes           TEXT,
  created_by      INTEGER REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type   TEXT NOT NULL CHECK (entity_type IN ('project', 'work_order', 'estimate', 'subcontractor', 'client')),
  entity_id     INTEGER NOT NULL,
  file_name     TEXT NOT NULL,
  file_key      TEXT NOT NULL UNIQUE,
  file_size     INTEGER,
  mime_type     TEXT,
  category      TEXT DEFAULT 'other' CHECK (category IN ('plan', 'permit', 'contract', 'photo', 'spec', 'rfi', 'submittal', 'insurance', 'w9', 'other')),
  description   TEXT,
  version       INTEGER NOT NULL DEFAULT 1,
  uploaded_by   INTEGER REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_work_orders_project ON work_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned ON work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_key ON documents(file_key);
