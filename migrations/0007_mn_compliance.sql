-- Migration 0007: Minnesota IC Compliance Tracking
-- Tracks the 14 criteria required under Minn. Stat. §181.723
-- for subcontractors to be classified as independent contractors.

CREATE TABLE IF NOT EXISTS subcontractor_mn_compliance (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  subcontractor_id        INTEGER NOT NULL UNIQUE REFERENCES subcontractors(id) ON DELETE CASCADE,

  -- Criterion 1: Separate Business Entity
  entity_type             TEXT CHECK (entity_type IN ('llc','corporation','sole_prop','partnership','other')),
  criterion_1_verified    INTEGER NOT NULL DEFAULT 0,
  criterion_1_notes       TEXT,

  -- Criterion 2: Own Tools / Equipment
  criterion_2_verified    INTEGER NOT NULL DEFAULT 0,
  criterion_2_notes       TEXT,

  -- Criterion 3: Works for Multiple Clients
  criterion_3_verified    INTEGER NOT NULL DEFAULT 0,
  criterion_3_notes       TEXT,

  -- Criterion 4: Federal EIN
  federal_ein             TEXT,
  criterion_4_verified    INTEGER NOT NULL DEFAULT 0,
  criterion_4_notes       TEXT,

  -- Criterion 5: Minnesota Tax ID
  mn_tax_id               TEXT,
  criterion_5_verified    INTEGER NOT NULL DEFAULT 0,
  criterion_5_notes       TEXT,

  -- Criterion 6: Receives 1099 Forms
  criterion_6_verified    INTEGER NOT NULL DEFAULT 0,
  criterion_6_notes       TEXT,

  -- Criterion 7: Files Business Taxes
  criterion_7_verified    INTEGER NOT NULL DEFAULT 0,
  criterion_7_notes       TEXT,

  -- Criterion 8: Written Contract
  criterion_8_verified    INTEGER NOT NULL DEFAULT 0,
  criterion_8_notes       TEXT,

  -- Criterion 9: Responsible for Completion of Work
  criterion_9_verified    INTEGER NOT NULL DEFAULT 0,
  criterion_9_notes       TEXT,

  -- Criterion 10: Control of Work
  criterion_10_verified   INTEGER NOT NULL DEFAULT 0,
  criterion_10_notes      TEXT,

  -- Criterion 11: Can Realize Profit or Loss
  criterion_11_verified   INTEGER NOT NULL DEFAULT 0,
  criterion_11_notes      TEXT,

  -- Criterion 12: Maintains Business Presence (auto-hinted from sub address)
  criterion_12_verified   INTEGER NOT NULL DEFAULT 0,
  criterion_12_notes      TEXT,

  -- Criterion 13: Insurance Requirements (extends existing general liability; adds workers' comp)
  workers_comp_carrier    TEXT,
  workers_comp_policy     TEXT,
  workers_comp_expiry     TEXT,
  criterion_13_verified   INTEGER NOT NULL DEFAULT 0,
  criterion_13_notes      TEXT,

  -- Criterion 14: Holds Required Licenses (auto-hinted from sub license fields)
  criterion_14_verified   INTEGER NOT NULL DEFAULT 0,
  criterion_14_notes      TEXT,

  last_reviewed_at        TEXT,
  last_reviewed_by        INTEGER REFERENCES users(id),
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Link documents to a specific compliance criterion (1–14)
-- Uses existing documents table; category stays 'other' for compliance docs
ALTER TABLE documents ADD COLUMN compliance_criterion INTEGER;

CREATE INDEX IF NOT EXISTS idx_mn_compliance_sub ON subcontractor_mn_compliance(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_documents_compliance ON documents(compliance_criterion);
