export interface User {
  id: number
  username: string
  email: string
  full_name: string
  role: 'admin' | 'pm' | 'estimator' | 'staff'
  last_login?: string | null
  created_at: string
}

export interface Client {
  id: number
  company_name: string
  industry?: string | null
  website?: string | null
  billing_address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  notes?: string | null
  status: 'active' | 'inactive' | 'prospect'
  created_by?: number | null
  created_at: string
  updated_at: string
  contacts?: Contact[]
}

export interface Contact {
  id: number
  client_id: number
  first_name: string
  last_name: string
  title?: string | null
  email?: string | null
  phone?: string | null
  phone_ext?: string | null
  mobile?: string | null
  is_primary: number
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface Lead {
  id: number
  client_id?: number | null
  contact_id?: number | null
  title: string
  description?: string | null
  estimated_value?: number | null
  stage: 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  source?: string | null
  probability?: number | null
  expected_close?: string | null
  assigned_to?: number | null
  lost_reason?: string | null
  company_name?: string | null
  assigned_name?: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: number
  project_number: string
  name: string
  client_id?: number | null
  lead_id?: number | null
  project_type: string
  status: string
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  description?: string | null
  contract_value?: number | null
  contract_type?: string | null
  start_date?: string | null
  end_date?: string | null
  actual_end_date?: string | null
  pm_id?: number | null
  superintendent_id?: number | null
  notes?: string | null
  company_name?: string | null
  pm_name?: string | null
  super_name?: string | null
  milestones?: Milestone[]
  task_counts?: { status: string; cnt: number }[]
  created_at: string
  updated_at: string
}

export interface Milestone {
  id: number
  project_id: number
  name: string
  description?: string | null
  due_date?: string | null
  completed_date?: string | null
  status: 'pending' | 'in_progress' | 'complete' | 'overdue'
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: number
  project_id: number
  milestone_id?: number | null
  title: string
  description?: string | null
  assigned_to?: number | null
  status: 'todo' | 'in_progress' | 'blocked' | 'done'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  due_date?: string | null
  completed_date?: string | null
  sort_order: number
  assigned_name?: string | null
  created_at: string
  updated_at: string
}

export interface Estimate {
  id: number
  estimate_number: string
  project_id?: number | null
  client_id: number
  contact_id?: number | null
  lead_id?: number | null
  title: string
  description?: string | null
  status: 'draft' | 'sent' | 'under_review' | 'accepted' | 'rejected' | 'expired'
  valid_until?: string | null
  subtotal: number
  markup_pct: number
  markup_amount: number
  tax_pct: number
  tax_amount: number
  total: number
  notes?: string | null
  client_notes?: string | null
  terms?: string | null
  sent_at?: string | null
  accepted_at?: string | null
  rejected_at?: string | null
  company_name?: string | null
  contact_name?: string | null
  sections?: EstimateSection[]
  line_items?: EstimateLineItem[]
  created_at: string
  updated_at: string
}

export interface EstimateSection {
  id: number
  estimate_id: number
  name: string
  sort_order: number
}

export interface EstimateLineItem {
  id: number
  estimate_id: number
  section_id?: number | null
  description: string
  quantity: number
  unit: string
  unit_cost: number
  total_cost: number
  category: string
  notes?: string | null
  sort_order: number
}

export interface WorkOrder {
  id: number
  wo_number: string
  project_id?: number | null
  client_id?: number | null
  contact_id?: number | null
  title: string
  description?: string | null
  scope_of_work?: string | null
  status: string
  priority: string
  wo_type?: string | null
  scheduled_date?: string | null
  due_date?: string | null
  completed_date?: string | null
  estimated_cost?: number | null
  actual_cost?: number | null
  assigned_to?: number | null
  approved_by?: number | null
  approved_at?: string | null
  notes?: string | null
  project_number?: string | null
  project_name?: string | null
  company_name?: string | null
  assigned_name?: string | null
  documents?: Document[]
  created_at: string
  updated_at: string
}

export interface Document {
  id: number
  entity_type: string
  entity_id: number
  file_name: string
  file_key: string
  file_size?: number | null
  mime_type?: string | null
  category: string
  description?: string | null
  compliance_criterion?: number | null
  version: number
  uploaded_by?: number | null
  uploaded_by_name?: string | null
  created_at: string
}

export interface Subcontractor {
  id: number
  // Business Identity
  company_name: string
  dba_name?: string | null
  business_structure?: 'sole_prop' | 'llc' | 'corporation' | 'partnership' | null
  state_of_registration?: string | null
  mn_sos_number?: string | null
  business_start_date?: string | null
  trade: string
  additional_trades?: string | null
  // Business address
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  // Mailing address
  mailing_address?: string | null
  mailing_city?: string | null
  mailing_state?: string | null
  mailing_zip?: string | null
  // Contact
  business_phone?: string | null
  business_email?: string | null
  website?: string | null
  // Legacy contact fields (preserved for backward compat)
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  // Legacy license/insurance fields (preserved; new records use sub-tables)
  license_number?: string | null
  license_state?: string | null
  license_expiry?: string | null
  insurance_carrier?: string | null
  insurance_policy?: string | null
  insurance_expiry?: string | null
  insurance_amount?: number | null
  // Tax Compliance
  federal_ein?: string | null
  w9_on_file: number
  mn_tax_id?: string | null
  mn_withholding_account?: string | null
  irs_1099_eligible: number
  // Operational Independence
  provides_own_tools: number
  provides_own_materials: number
  provides_own_equipment: number
  responsible_for_labor: number
  can_hire_employees: number
  advertises_to_public: number
  has_multiple_clients: number
  maintains_separate_location: number
  can_realize_profit_loss: number
  // Payment Reporting
  vendor_id?: string | null
  payment_method?: 'check' | 'ach' | 'wire' | 'credit_card' | 'other' | null
  requires_1099: number
  date_1099_issued?: string | null
  accounting_system_ref?: string | null
  // Risk & Status
  compliance_score?: number | null
  risk_level?: 'low' | 'medium' | 'high' | null
  prequalified: number
  rating?: number | null
  status: 'active' | 'inactive' | 'do_not_use'
  notes?: string | null
  // Computed
  verified_count?: number | null
  // Relations
  owners?: SubcontractorOwner[]
  licenses?: SubcontractorLicense[]
  insurance_policies?: SubcontractorInsurancePolicy[]
  contracts?: SubcontractorContract[]
  bids?: SubcontractorBid[]
  projects?: SubcontractorProject[]
  documents?: Document[]
  created_at: string
  updated_at: string
}

export interface SubcontractorOwner {
  id: number
  subcontractor_id: number
  owner_name: string
  title?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  phone?: string | null
  email?: string | null
  ownership_pct?: number | null
  ssn_last4?: string | null
  is_primary: number
  created_at: string
  updated_at: string
}

export interface SubcontractorLicense {
  id: number
  subcontractor_id: number
  license_type: 'general_contractor' | 'electrical' | 'plumbing' | 'hvac' | 'dli' | 'other'
  license_number: string
  issuing_authority?: string | null
  state?: string | null
  expiration_date?: string | null
  specialty_trade?: string | null
  is_primary: number
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface SubcontractorInsurancePolicy {
  id: number
  subcontractor_id: number
  policy_type: 'general_liability' | 'workers_comp' | 'commercial_auto' | 'umbrella' | 'builders_risk' | 'other'
  carrier: string
  policy_number?: string | null
  coverage_amount?: number | null
  effective_date?: string | null
  expiration_date?: string | null
  num_employees_covered?: number | null
  is_exempt: number
  exempt_reason?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface SubcontractorContract {
  id: number
  subcontractor_id: number
  project_id?: number | null
  contract_title: string
  scope_of_work?: string | null
  start_date?: string | null
  end_date?: string | null
  payment_terms?: 'lump_sum' | 'unit_price' | 'time_materials' | null
  contract_value?: number | null
  responsible_for_completion: number
  written_contract_on_file: number
  status: 'draft' | 'active' | 'complete' | 'terminated'
  notes?: string | null
  project_number?: string | null
  project_name?: string | null
  created_by?: number | null
  created_at: string
  updated_at: string
}

export interface MNCompliance {
  id?: number
  subcontractor_id: number
  entity_type?: 'llc' | 'corporation' | 'sole_prop' | 'partnership' | 'other' | null
  criterion_1_verified: number
  criterion_1_notes?: string | null
  criterion_2_verified: number
  criterion_2_notes?: string | null
  criterion_3_verified: number
  criterion_3_notes?: string | null
  federal_ein?: string | null
  criterion_4_verified: number
  criterion_4_notes?: string | null
  mn_tax_id?: string | null
  criterion_5_verified: number
  criterion_5_notes?: string | null
  criterion_6_verified: number
  criterion_6_notes?: string | null
  criterion_7_verified: number
  criterion_7_notes?: string | null
  criterion_8_verified: number
  criterion_8_notes?: string | null
  criterion_9_verified: number
  criterion_9_notes?: string | null
  criterion_10_verified: number
  criterion_10_notes?: string | null
  criterion_11_verified: number
  criterion_11_notes?: string | null
  criterion_12_verified: number
  criterion_12_notes?: string | null
  workers_comp_carrier?: string | null
  workers_comp_policy?: string | null
  workers_comp_expiry?: string | null
  criterion_13_verified: number
  criterion_13_notes?: string | null
  criterion_14_verified: number
  criterion_14_notes?: string | null
  verified_count?: number
  last_reviewed_at?: string | null
  updated_at?: string
}

export interface SubcontractorBid {
  id: number
  subcontractor_id: number
  project_id?: number | null
  estimate_id?: number | null
  trade_package: string
  bid_amount?: number | null
  bid_date?: string | null
  bid_status: string
  awarded_amount?: number | null
  awarded_date?: string | null
  notes?: string | null
  project_number?: string | null
  project_name?: string | null
  created_at: string
  updated_at: string
}

export interface SubcontractorProject {
  id: number
  subcontractor_id: number
  project_id: number
  trade_package?: string | null
  contract_amount?: number | null
  status: string
  start_date?: string | null
  end_date?: string | null
  project_number?: string | null
  name?: string | null
  project_status?: string | null
  created_at: string
}

export interface DashboardStats {
  active_projects: number
  open_estimates: { count: number; total_value: number }
  open_work_orders: number
  my_tasks_due: number
  projects_by_status: { status: string; count: number }[]
  subs_expiring: number
}
