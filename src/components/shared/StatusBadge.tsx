import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  colorMap?: Record<string, string>
  labelMap?: Record<string, string>
  className?: string
}

const DEFAULT_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  pending: 'bg-yellow-100 text-yellow-700',
  complete: 'bg-teal-100 text-teal-700',
  done: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-red-100 text-red-700',
  draft: 'bg-slate-100 text-slate-600',
}

export function StatusBadge({ status, colorMap, labelMap, className }: StatusBadgeProps) {
  const colors = colorMap ?? DEFAULT_COLORS
  const color = colors[status] ?? 'bg-slate-100 text-slate-600'
  const label = labelMap?.[status] ?? status.replace(/_/g, ' ')

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize', color, className)}>
      {label}
    </span>
  )
}
