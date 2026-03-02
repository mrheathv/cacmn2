import { useMemo } from 'react'
import { parseISO, isValid, differenceInDays, format } from 'date-fns'
import type { Milestone } from '@/types'
import { cn } from '@/lib/utils'

const MILESTONE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-300',
  in_progress: 'bg-blue-400',
  complete: 'bg-green-400',
  overdue: 'bg-red-400',
}

interface ProjectTimelineProps {
  milestones: Milestone[]
  projectStart?: string | null
  projectEnd?: string | null
}

export function ProjectTimeline({ milestones, projectStart, projectEnd }: ProjectTimelineProps) {
  const withDates = milestones.filter(m => m.due_date)

  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    const dates: Date[] = []
    if (projectStart) { const d = parseISO(projectStart); if (isValid(d)) dates.push(d) }
    if (projectEnd) { const d = parseISO(projectEnd); if (isValid(d)) dates.push(d) }
    withDates.forEach(m => {
      if (m.due_date) { const d = parseISO(m.due_date); if (isValid(d)) dates.push(d) }
    })
    if (dates.length === 0) return { rangeStart: new Date(), rangeEnd: new Date(), totalDays: 1 }
    const min = new Date(Math.min(...dates.map(d => d.getTime())))
    const max = new Date(Math.max(...dates.map(d => d.getTime())))
    // Pad 5 days on each side
    min.setDate(min.getDate() - 5)
    max.setDate(max.getDate() + 5)
    return { rangeStart: min, rangeEnd: max, totalDays: differenceInDays(max, min) || 1 }
  }, [withDates, projectStart, projectEnd])

  const pct = (date: Date) => Math.max(0, Math.min(100, (differenceInDays(date, rangeStart) / totalDays) * 100))

  if (withDates.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No milestone dates set — add due dates to see the timeline.</p>
  }

  // Month tick marks
  const ticks: { label: string; pct: number }[] = []
  const cursor = new Date(rangeStart)
  cursor.setDate(1)
  cursor.setMonth(cursor.getMonth() + 1)
  while (cursor < rangeEnd) {
    ticks.push({ label: format(cursor, 'MMM'), pct: pct(cursor) })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return (
    <div className="py-2">
      {/* Month ticks */}
      <div className="relative h-5 mb-1">
        {ticks.map((t, i) => (
          <span key={i} className="absolute text-[10px] text-muted-foreground -translate-x-1/2" style={{ left: `${t.pct}%` }}>
            {t.label}
          </span>
        ))}
      </div>

      {/* Baseline */}
      <div className="relative border-t border-border pt-2 space-y-2">
        {/* Today marker */}
        {(() => {
          const todayPct = pct(new Date())
          if (todayPct >= 0 && todayPct <= 100) {
            return (
              <div className="absolute top-0 bottom-0 w-px bg-amber-400 z-10" style={{ left: `${todayPct}%` }}>
                <span className="absolute -top-4 -translate-x-1/2 text-[9px] font-semibold text-amber-600 bg-amber-50 px-1 rounded">TODAY</span>
              </div>
            )
          }
        })()}

        {withDates.map(m => {
          const dueDate = parseISO(m.due_date!)
          const duePct = pct(dueDate)
          const color = MILESTONE_STATUS_COLORS[m.status] ?? 'bg-slate-300'

          return (
            <div key={m.id} className="relative flex items-center h-7">
              {/* Label */}
              <span className="text-xs text-muted-foreground w-32 flex-shrink-0 truncate pr-2">{m.name}</span>

              {/* Bar area */}
              <div className="flex-1 relative h-full">
                {/* Diamond marker at due date */}
                <div
                  className={cn('absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rotate-45 rounded-sm', color)}
                  style={{ left: `${duePct}%` }}
                  title={`Due: ${format(dueDate, 'MMM d, yyyy')} · ${m.status}`}
                />
                {/* Thin line from left edge to marker */}
                <div
                  className={cn('absolute top-1/2 h-1 -translate-y-1/2 rounded opacity-30', color)}
                  style={{ left: 0, width: `${duePct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
        <span>{format(rangeStart, 'MMM d')}</span>
        <span>{format(rangeEnd, 'MMM d, yyyy')}</span>
      </div>
    </div>
  )
}
