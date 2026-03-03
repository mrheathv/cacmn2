import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { WorkOrder, Client, Project, User } from '@/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { WorkOrderForm, type WorkOrderFormData } from '@/components/work-orders/WorkOrderForm'
import { SearchInput } from '@/components/shared/SearchInput'
import { formatCurrency, formatDate, WO_STATUS_COLORS } from '@/lib/utils'
import { toast } from '@/hooks/useToast'
import { Plus, ClipboardList } from 'lucide-react'

const STATUS_TABS = ['all', 'draft', 'issued', 'in_progress', 'pending_approval', 'complete', 'cancelled']
const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-muted-foreground',
  normal: 'text-foreground',
  high: 'text-orange-600 font-medium',
  urgent: 'text-red-600 font-bold',
}

export function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    const [wos, clientData, projData, userData] = await Promise.all([
      api.get<WorkOrder[]>('/work-orders'),
      api.get<Client[]>('/clients'),
      api.get<Project[]>('/projects'),
      api.get<User[]>('/users').catch(() => [] as User[]),
    ])
    setWorkOrders(wos)
    setClients(clientData)
    setProjects(projData)
    setUsers(userData)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (data: WorkOrderFormData) => {
    try {
      await api.post('/work-orders', data)
      toast({ title: 'Work order created' })
      setCreateOpen(false)
      load()
    } catch (e) {
      toast({ title: 'Error creating work order', description: String(e), variant: 'destructive' })
    }
  }

  const filtered = workOrders.filter(wo => {
    const matchStatus = statusFilter === 'all' || wo.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q || wo.title.toLowerCase().includes(q) ||
      wo.wo_number.toLowerCase().includes(q) ||
      (wo.company_name ?? '').toLowerCase().includes(q) ||
      (wo.project_name ?? '').toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const counts = STATUS_TABS.reduce<Record<string, number>>((acc, s) => {
    acc[s] = s === 'all' ? workOrders.length : workOrders.filter(w => w.status === s).length
    return acc
  }, {})

  if (loading) return <div className="p-6"><div className="h-96 bg-muted rounded animate-pulse" /></div>

  return (
    <div className="p-6">
      <PageHeader
        title="Work Orders"
        subtitle={`${workOrders.length} total`}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Work Order
          </Button>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 border-b overflow-x-auto">
        {STATUS_TABS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
              statusFilter === s
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ')} {counts[s] > 0 && `(${counts[s]})`}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search work orders…" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No work orders found"
          description={search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Create your first work order to get started.'}
          action={!search && statusFilter === 'all'
            ? <Button size="sm" onClick={() => setCreateOpen(true)}>New Work Order</Button>
            : undefined}
        />
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Number</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client / Project</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Assigned</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Est. Cost</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(wo => (
                <tr key={wo.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link to={`/work-orders/${wo.id}`} className="font-mono text-xs text-muted-foreground hover:text-primary">
                      {wo.wo_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/work-orders/${wo.id}`} className="font-medium hover:text-primary">{wo.title}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {wo.company_name && <div>{wo.company_name}</div>}
                    {wo.project_name && <div className="text-xs opacity-70">{wo.project_number} — {wo.project_name}</div>}
                    {!wo.company_name && !wo.project_name && '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={wo.status} colorMap={WO_STATUS_COLORS} />
                  </td>
                  <td className={`px-4 py-3 capitalize text-sm ${PRIORITY_COLORS[wo.priority] ?? ''}`}>{wo.priority}</td>
                  <td className="px-4 py-3 text-muted-foreground">{wo.assigned_name ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(wo.estimated_cost)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(wo.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <WorkOrderForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleCreate}
        clients={clients}
        projects={projects}
        users={users}
        title="New Work Order"
      />
    </div>
  )
}
