import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Project, Client, User } from '@/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ProjectForm, type ProjectFormData } from '@/components/projects/ProjectForm'
import { toast } from '@/hooks/useToast'
import { formatCurrency, formatDate, PROJECT_STATUS_COLORS } from '@/lib/utils'
import { Plus, FolderOpen, ExternalLink } from 'lucide-react'

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'planning', label: 'Planning' },
  { value: 'bidding', label: 'Bidding' },
  { value: 'awarded', label: 'Awarded' },
  { value: 'active', label: 'Active' },
  { value: 'punch_list', label: 'Punch List' },
  { value: 'complete', label: 'Complete' },
]

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [pmFilter, setPmFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (pmFilter) params.set('pm_id', pmFilter)
    if (search) params.set('search', search)
    const data = await api.get<Project[]>(`/projects?${params}`)
    setProjects(data)
    setLoading(false)
  }, [statusFilter, pmFilter, search])

  useEffect(() => {
    Promise.all([
      api.get<Client[]>('/clients'),
      api.get<User[]>('/users').catch(() => [] as User[]),
    ]).then(([c, u]) => { setClients(c); setUsers(u) })
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (data: ProjectFormData) => {
    await api.post('/projects', data)
    toast({ title: 'Project created' })
    setShowForm(false)
    load()
  }

  const pms = users.filter(u => ['admin', 'pm'].includes(u.role))

  return (
    <div className="p-6">
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} project${projects.length !== 1 ? 's' : ''}`}
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> New Project
          </Button>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setStatusFilter(t.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === t.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex gap-3 mb-5">
        <SearchInput value={search} onChange={setSearch} placeholder="Search projects..." className="max-w-sm" />
        <Select value={pmFilter || 'all'} onValueChange={v => setPmFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All PMs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All PMs</SelectItem>
            {pms.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}</div>
      ) : projects.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No projects found" description="Create your first project to get started." action={<Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> New Project</Button>} />
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Number</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Project</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Value</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">PM</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Start</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y">
              {projects.map(p => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-muted-foreground">{p.project_number}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/projects/${p.id}`} className="font-medium hover:text-primary">{p.name}</Link>
                    <p className="text-xs text-muted-foreground capitalize">{p.project_type.replace('_', ' ')}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.company_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} colorMap={PROJECT_STATUS_COLORS} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.contract_value)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.pm_name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(p.start_date, 'MMM d, yy')}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/projects/${p.id}`} className="text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProjectForm
        open={showForm}
        onOpenChange={setShowForm}
        onSave={handleCreate}
        clients={clients}
        users={users}
      />
    </div>
  )
}
