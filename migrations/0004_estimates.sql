-- Migration 0004: Estimates, Sections, Line Items

CREATE TABLE IF NOT EXISTS estimates (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  estimate_number TEXT NOT NULL UNIQUE,
  project_id      INTEGER REFERENCES projects(id),
  client_id       INTEGER NOT NULL REFERENCES clients(id),
  contact_id      INTEGER REFERENCES contacts(id),
  lead_id         INTEGER REFERENCES leads(id),
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'under_review', 'accepted', 'rejected', 'expired')),
  valid_until     TEXT,
  subtotal        REAL NOT NULL DEFAULT 0,
  markup_pct      REAL NOT NULL DEFAULT 0,
  markup_amount   REAL NOT NULL DEFAULT 0,
  tax_pct         REAL NOT NULL DEFAULT 0,
  tax_amount      REAL NOT NULL DEFAULT 0,
  total           REAL NOT NULL DEFAULT 0,
  notes           TEXT,
  client_notes    TEXT,
  terms           TEXT DEFAULT 'Net 30',
  sent_at         TEXT,
  accepted_at     TEXT,
  rejected_at     TEXT,
  rejected_reason TEXT,
  created_by      INTEGER REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS estimate_sections (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  estimate_id INTEGER NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS estimate_line_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  estimate_id INTEGER NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  section_id  INTEGER REFERENCES estimate_sections(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity    REAL NOT NULL DEFAULT 1,
  unit        TEXT DEFAULT 'LS' CHECK (unit IN ('SF', 'LF', 'EA', 'LS', 'HR', 'CY', 'TN', 'GAL', 'SQ')),
  unit_cost   REAL NOT NULL DEFAULT 0,
  total_cost  REAL NOT NULL DEFAULT 0,
  category    TEXT DEFAULT 'other' CHECK (category IN ('labor', 'material', 'equipment', 'subcontractor', 'other')),
  notes       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_estimates_client ON estimates(client_id);
CREATE INDEX IF NOT EXISTS idx_estimates_project ON estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_sections_estimate ON estimate_sections(estimate_id);
CREATE INDEX IF NOT EXISTS idx_line_items_estimate ON estimate_line_items(estimate_id);
CREATE INDEX IF NOT EXISTS idx_line_items_section ON estimate_line_items(section_id);
