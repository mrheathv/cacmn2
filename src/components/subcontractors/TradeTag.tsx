import { TRADE_LABELS } from '@/lib/utils'

interface TradeTagProps {
  trade: string
  className?: string
}

const TRADE_COLORS: Record<string, string> = {
  concrete: 'bg-stone-100 text-stone-700',
  steel: 'bg-zinc-100 text-zinc-700',
  carpentry: 'bg-amber-100 text-amber-700',
  masonry: 'bg-orange-100 text-orange-700',
  roofing: 'bg-red-100 text-red-700',
  plumbing: 'bg-blue-100 text-blue-700',
  electrical: 'bg-yellow-100 text-yellow-800',
  hvac: 'bg-cyan-100 text-cyan-700',
  drywall: 'bg-slate-100 text-slate-700',
  painting: 'bg-pink-100 text-pink-700',
  flooring: 'bg-teal-100 text-teal-700',
  glazing: 'bg-sky-100 text-sky-700',
  site_work: 'bg-green-100 text-green-700',
  demolition: 'bg-red-100 text-red-800',
  landscaping: 'bg-emerald-100 text-emerald-700',
  other: 'bg-gray-100 text-gray-700',
}

export function TradeTag({ trade, className = '' }: TradeTagProps) {
  const color = TRADE_COLORS[trade] ?? 'bg-gray-100 text-gray-700'
  const label = TRADE_LABELS[trade] ?? trade.replace('_', ' ')
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color} ${className}`}>
      {label}
    </span>
  )
}
