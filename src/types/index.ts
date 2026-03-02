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
  version: number
  uploaded_by?: number | null
  uploaded_by_name?: string | null
  created_at: string
}

export interface Subcontractor {
  id: number
  company_name: string
  trade: string
  additional_trades?: string | null
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  website?: string | null
  license_number?: string | null
  license_state?: string | null
  license_expiry?: string | null
  insurance_carrier?: string | null
  insurance_policy?: string | null
  insurance_expiry?: string | null
  insurance_amount?: number | null
  w9_on_file: number
  prequalified: number
  rating?: number | null
  status: 'active' | 'inactive' | 'do_not_use'
  notes?: string | null
  bids?: SubcontractorBid[]
  projects?: SubcontractorProject[]
  documents?: Document[]
  created_at: string
  updated_at: string
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
