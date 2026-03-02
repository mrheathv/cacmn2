-- Migration 0003: Projects, Milestones, Tasks

CREATE TABLE IF NOT EXISTS projects (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  project_number      TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  client_id           INTEGER REFERENCES clients(id),
  lead_id             INTEGER REFERENCES leads(id),
  project_type        TEXT NOT NULL CHECK (project_type IN ('renovation', 'tenant_improvement', 'new_construction', 'addition', 'service', 'association')),
  status              TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'bidding', 'awarded', 'active', 'punch_list', 'complete', 'cancelled')),
  address             TEXT,
  city                TEXT,
  state               TEXT DEFAULT 'MN',
  zip                 TEXT,
  description         TEXT,
  contract_value      REAL,
  contract_type       TEXT CHECK (contract_type IN ('lump_sum', 'gmp', 'cost_plus', 'time_materials')),
  start_date          TEXT,
  end_date            TEXT,
  actual_end_date     TEXT,
  pm_id               INTEGER REFERENCES users(id),
  superintendent_id   INTEGER REFERENCES users(id),
  notes               TEXT,
  created_by          INTEGER REFERENCES users(id),
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS milestones (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  due_date        TEXT,
  completed_date  TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'complete', 'overdue')),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id    INTEGER REFERENCES milestones(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  assigned_to     INTEGER REFERENCES users(id),
  status          TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
  priority        TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date        TEXT,
  completed_date  TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_by      INTEGER REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_pm ON projects(pm_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone ON tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
