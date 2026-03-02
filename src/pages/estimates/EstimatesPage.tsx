import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Estimate, Client, Project } from '@/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { EstimateForm, type EstimateFormData } from '@/components/estimates/EstimateForm'
import { SearchInput } from '@/components/shared/SearchInput'
import { formatCurrency, formatDate, ESTIMATE_STATUS_COLORS } from '@/lib/utils'
import { toast } from '@/hooks/useToast'
import { Plus, FileText } from 'lucide-react'

const STATUS_TABS = ['all', 'draft', 'sent', 'under_review', 'accepted', 'rejected', 'expired']

export function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    const [data, clientData, projData] = await Promise.all([
      api.get<Estimate[]>('/estimates'),
      api.get<Client[]>('/clients'),
      api.get<Project[]>('/projects'),
    ])
    setEstimates(data)
    setClients(clientData)
    setProjects(projData)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (data: EstimateFormData) => {
    await api.post<Estimate>('/estimates', data)
    toast({ title: 'Estimate created' })
    setCreateOpen(false)
    load()
  }

  const filtered = estimates.filter(e => {
    const matchStatus = statusFilter === 'all' || e.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q || e.title.toLowerCase().includes(q) ||
      e.estimate_number.toLowerCase().includes(q) ||
      (e.company_name ?? '').toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const counts = STATUS_TABS.reduce<Record<string, number>>((acc, s) => {
    acc[s] = s === 'all' ? estimates.length : estimates.filter(e => e.status === s).length
    return acc
  }, {})

  if (loading) return <div className="p-6"><div className="h-96 bg-muted rounded animate-pulse" /></div>

  return (
    <div className="p-6">
      <PageHeader
        title="Estimates"
        subtitle={`${estimates.length} total`}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Estimate
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
        <SearchInput value={search} onChange={setSearch} placeholder="Search estimates…" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No estimates found"
          description={search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Create your first estimate to get started.'}
          action={!search && statusFilter === 'all'
            ? <Button size="sm" onClick={() => setCreateOpen(true)}>New Estimate</Button>
            : undefined}
        />
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Number</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Valid Until</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link to={`/estimates/${e.id}`} className="font-mono text-xs text-muted-foreground hover:text-primary">
                      {e.estimate_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/estimates/${e.id}`} className="font-medium hover:text-primary">{e.title}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{e.company_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={e.status} colorMap={ESTIMATE_STATUS_COLORS} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(e.total)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(e.valid_until)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(e.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EstimateForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleCreate}
        clients={clients}
        projects={projects}
        title="New Estimate"
      />
    </div>
  )
}
