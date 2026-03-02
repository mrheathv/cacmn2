import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { DashboardStats, Task } from '@/types'
import { formatCurrency, formatDate, PROJECT_STATUS_COLORS } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { FolderOpen, FileText, ClipboardList, CheckSquare, AlertTriangle, TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const STATUS_CHART_COLORS: Record<string, string> = {
  planning: '#94a3b8',
  bidding: '#60a5fa',
  awarded: '#a78bfa',
  active: '#34d399',
  punch_list: '#fbbf24',
  complete: '#2dd4bf',
  cancelled: '#f87171',
}

function StatsCard({ icon: Icon, label, value, sub, color = 'text-foreground' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [activity, setActivity] = useState<{ type: string; id: number; title: string; status: string; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<DashboardStats>('/dashboard/stats'),
      api.get<Task[]>('/dashboard/tasks-due'),
      api.get<typeof activity>('/dashboard/activity'),
    ]).then(([s, t, a]) => {
      setStats(s); setTasks(t); setActivity(a)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const chartData = (stats?.projects_by_status ?? []).map(s => ({
    name: s.status.replace('_', ' '),
    value: s.count,
    fill: STATUS_CHART_COLORS[s.status] ?? '#94a3b8',
  }))

  return (
    <div className="p-6">
      <PageHeader title="Dashboard" subtitle="Construct-All Corporation — Operations Overview" />

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-16 bg-muted rounded animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard
              icon={FolderOpen}
              label="Active Projects"
              value={stats?.active_projects ?? 0}
              color="text-green-600"
            />
            <StatsCard
              icon={FileText}
              label="Open Estimates"
              value={formatCurrency(stats?.open_estimates.total_value)}
              sub={`${stats?.open_estimates.count ?? 0} pending`}
              color="text-blue-600"
            />
            <StatsCard
              icon={ClipboardList}
              label="Open Work Orders"
              value={stats?.open_work_orders ?? 0}
              color="text-amber-600"
            />
            <StatsCard
              icon={CheckSquare}
              label="My Tasks Due"
              value={stats?.my_tasks_due ?? 0}
              sub="within 7 days"
              color={stats?.my_tasks_due ? 'text-red-600' : 'text-foreground'}
            />
          </div>

          {stats?.subs_expiring ? (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span><strong>{stats.subs_expiring}</strong> subcontractor{stats.subs_expiring > 1 ? 's have' : ' has'} insurance or license expiring within 30 days.</span>
              <Link to="/subcontractors" className="underline font-medium">Review</Link>
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Project Status Chart */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Projects by Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">No project data yet</p>
                )}
              </CardContent>
            </Card>

            {/* Tasks Due Soon */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" /> My Tasks Due Soon
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No tasks due this week</p>
                ) : (
                  <ul className="divide-y text-sm">
                    {tasks.slice(0, 8).map(t => (
                      <li key={t.id} className="py-2">
                        <Link to={`/projects/${t.project_id}`} className="font-medium hover:text-primary truncate block">{t.title}</Link>
                        <p className="text-xs text-muted-foreground">{t.due_date ? formatDate(t.due_date) : '—'}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          {activity.length > 0 && (
            <Card className="mt-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  {activity.map((a, i) => {
                    const href = a.type === 'project' ? `/projects/${a.id}`
                      : a.type === 'estimate' ? `/estimates/${a.id}`
                      : `/work-orders/${a.id}`
                    return (
                      <li key={i} className="py-2 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs uppercase text-muted-foreground font-medium w-20 flex-shrink-0">{a.type.replace('_', ' ')}</span>
                          <Link to={href} className="font-medium hover:text-primary truncate">{a.title}</Link>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <StatusBadge status={a.status} colorMap={PROJECT_STATUS_COLORS} />
                          <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
