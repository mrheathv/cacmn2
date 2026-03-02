-- Migration 0002: CRM — Clients, Contacts, Leads, Activities

CREATE TABLE IF NOT EXISTS clients (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name    TEXT NOT NULL,
  industry        TEXT CHECK (industry IN ('retail', 'office', 'medical', 'hospitality', 'industrial', 'education', 'government', 'association', 'other')),
  website         TEXT,
  billing_address TEXT,
  city            TEXT,
  state           TEXT DEFAULT 'MN',
  zip             TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
  created_by      INTEGER REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contacts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  title       TEXT,
  email       TEXT,
  phone       TEXT,
  phone_ext   TEXT,
  mobile      TEXT,
  is_primary  INTEGER NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leads (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id         INTEGER REFERENCES clients(id),
  contact_id        INTEGER REFERENCES contacts(id),
  title             TEXT NOT NULL,
  description       TEXT,
  estimated_value   REAL,
  stage             TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  source            TEXT CHECK (source IN ('referral', 'repeat', 'cold', 'bid_board', 'website', 'other')),
  probability       INTEGER DEFAULT 50,
  expected_close    TEXT,
  assigned_to       INTEGER REFERENCES users(id),
  lost_reason       TEXT,
  created_by        INTEGER REFERENCES users(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS client_activities (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id       INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contact_id      INTEGER REFERENCES contacts(id),
  lead_id         INTEGER REFERENCES leads(id),
  activity_type   TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'site_visit')),
  subject         TEXT NOT NULL,
  body            TEXT,
  activity_date   TEXT NOT NULL DEFAULT (datetime('now')),
  created_by      INTEGER REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contacts_client ON contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_client ON leads(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_client_activities_client ON client_activities(client_id);
