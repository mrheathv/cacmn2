import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isValid } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

export function formatDate(dateStr: string | null | undefined, fmt = 'MMM d, yyyy'): string {
  if (!dateStr) return '—'
  try {
    const d = parseISO(dateStr)
    return isValid(d) ? format(d, fmt) : '—'
  } catch { return '—' }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  return formatDate(dateStr, 'MMM d, yyyy h:mm a')
}

export function initials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  planning: 'bg-slate-100 text-slate-700',
  bidding: 'bg-blue-100 text-blue-700',
  awarded: 'bg-purple-100 text-purple-700',
  active: 'bg-green-100 text-green-700',
  punch_list: 'bg-yellow-100 text-yellow-700',
  complete: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-red-100 text-red-700',
}

export const ESTIMATE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
}

export const WO_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  issued: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  pending_approval: 'bg-purple-100 text-purple-700',
  complete: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export const LEAD_STAGE_COLORS: Record<string, string> = {
  new: 'bg-slate-100 text-slate-700',
  qualified: 'bg-blue-100 text-blue-700',
  proposal: 'bg-amber-100 text-amber-700',
  negotiation: 'bg-purple-100 text-purple-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
}

export const TASK_PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

export const TRADE_LABELS: Record<string, string> = {
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  hvac: 'HVAC',
  framing: 'Framing',
  drywall: 'Drywall',
  flooring: 'Flooring',
  painting: 'Painting',
  roofing: 'Roofing',
  concrete: 'Concrete',
  steel: 'Structural Steel',
  glass_glazing: 'Glass & Glazing',
  elevator: 'Elevator',
  fire_protection: 'Fire Protection',
  low_voltage: 'Low Voltage',
  landscaping: 'Landscaping',
  demolition: 'Demolition',
  general: 'General',
  other: 'Other',
}
