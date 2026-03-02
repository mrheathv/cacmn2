import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { WorkOrder, Document, Client, Project, User } from '@/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { FileUpload, FileList } from '@/components/shared/FileUpload'
import { WorkOrderForm, type WorkOrderFormData } from '@/components/work-orders/WorkOrderForm'
import { toast } from '@/hooks/useToast'
import { formatCurrency, formatDate, WO_STATUS_COLORS } from '@/lib/utils'
import { Pencil } from 'lucide-react'

const WO_STATUS_FLOW: Record<string, string[]> = {
  draft: ['issued'],
  issued: ['in_progress', 'cancelled'],
  in_progress: ['pending_approval', 'cancelled'],
  pending_approval: ['complete', 'in_progress'],
  complete: [],
  cancelled: [],
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-muted-foreground',
  normal: 'text-foreground',
  high: 'text-orange-600',
  urgent: 'text-red-600',
}

export function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [wo, setWo] = useState<WorkOrder | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!id) return
    const [data, docs] = await Promise.all([
      api.get<WorkOrder>(`/work-orders/${id}`),
      api.get<Document[]>(`/documents?entity_type=work_order&entity_id=${id}`),
    ])
    setWo(data)
    setDocuments(docs)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    Promise.all([
      api.get<Client[]>('/clients'),
      api.get<Project[]>('/projects'),
      api.get<User[]>('/users').catch(() => [] as User[]),
    ]).then(([c, p, u]) => { setClients(c); setProjects(p); setUsers(u) })
  }, [])

  const handleEdit = async (data: WorkOrderFormData) => {
    await api.put(`/work-orders/${id}`, data)
    toast({ title: 'Work order updated' })
    setEditOpen(false)
    load()
  }

  const updateStatus = async (status: string) => {
    await api.patch(`/work-orders/${id}/status`, { status })
    toast({ title: `Status updated to ${status.replace('_', ' ')}` })
    load()
  }

  if (loading) return <div className="p-6"><div className="h-96 bg-muted rounded animate-pulse" /></div>
  if (!wo) return <div className="p-6 text-muted-foreground">Work order not found.</div>

  const nextStatuses = WO_STATUS_FLOW[wo.status] ?? []

  return (
    <div className="p-6">
      <PageHeader
        title={wo.title}
        subtitle={
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{wo.wo_number}</span>
            <StatusBadge status={wo.status} colorMap={WO_STATUS_COLORS} />
            <span className={`text-xs capitalize font-medium ${PRIORITY_COLORS[wo.priority] ?? ''}`}>{wo.priority} priority</span>
          </span>
        }
        actions={
          <div className="flex gap-2 flex-wrap">
            <Link to="/work-orders"><Button variant="outline" size="sm">← Work Orders</Button></Link>
            {nextStatuses.map(s => (
              <Button
                key={s}
                size="sm"
                variant={s === 'cancelled' ? 'destructive' : s === 'complete' ? 'default' : 'outline'}
                onClick={() => updateStatus(s)}
              >
                → {s.replace('_', ' ')}
              </Button>
            ))}
            <Button size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {wo.description && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Description</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-wrap">{wo.description}</CardContent>
            </Card>
          )}
          {wo.scope_of_work && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Scope of Work</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-wrap">{wo.scope_of_work}</CardContent>
            </Card>
          )}
          {wo.notes && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-wrap">{wo.notes}</CardContent>
            </Card>
          )}

          {/* Documents */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Documents ({documents.length})</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <FileUpload
                entityType="work_order"
                entityId={wo.id}
                onUploaded={doc => setDocuments(prev => [doc, ...prev])}
              />
              <FileList
                documents={documents}
                onDeleted={docId => setDocuments(prev => prev.filter(d => d.id !== docId))}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-2 text-sm">
              <Row label="Type" value={wo.wo_type?.replace('_', ' ')} />
              <Row label="Priority" value={wo.priority} />
              <Row label="Assigned" value={wo.assigned_name} />
              <Row label="Client" value={wo.company_name} />
              {wo.project_name && <Row label="Project" value={`${wo.project_number} — ${wo.project_name}`} />}
              <Row label="Scheduled" value={formatDate(wo.scheduled_date)} />
              <Row label="Due" value={formatDate(wo.due_date)} />
              {wo.completed_date && <Row label="Completed" value={formatDate(wo.completed_date)} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Costs</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-2 text-sm">
              <Row label="Estimated" value={formatCurrency(wo.estimated_cost)} />
              {wo.actual_cost != null && <Row label="Actual" value={formatCurrency(wo.actual_cost)} />}
            </CardContent>
          </Card>

          {wo.approved_by && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Approval</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4 text-sm">
                {wo.approved_at && <Row label="Approved" value={formatDate(wo.approved_at)} />}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <WorkOrderForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleEdit}
        clients={clients}
        projects={projects}
        users={users}
        initialValues={wo}
        title="Edit Work Order"
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <span className="font-medium text-right capitalize">{value ?? '—'}</span>
    </div>
  )
}
