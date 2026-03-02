import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Estimate, Client, Project } from '@/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EstimateForm, type EstimateFormData } from '@/components/estimates/EstimateForm'
import { LineItemTable } from '@/components/estimates/LineItemTable'
import { EstimatePreview } from '@/components/estimates/EstimatePreview'
import { EstimateSummary } from '@/components/estimates/EstimateSummary'
import { toast } from '@/hooks/useToast'
import { formatDate, ESTIMATE_STATUS_COLORS } from '@/lib/utils'
import { Pencil, Printer, Send, CheckCircle, XCircle, Copy } from 'lucide-react'

export function EstimateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!id) return
    const data = await api.get<Estimate>(`/estimates/${id}`)
    setEstimate(data)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    Promise.all([
      api.get<Client[]>('/clients'),
      api.get<Project[]>('/projects'),
    ]).then(([c, p]) => { setClients(c); setProjects(p) })
  }, [])

  const handleEdit = async (data: EstimateFormData) => {
    await api.put(`/estimates/${id}`, data)
    toast({ title: 'Estimate updated' })
    setEditOpen(false)
    load()
  }

  const doAction = async (action: string, label: string) => {
    await api.post(`/estimates/${id}/${action}`, {})
    toast({ title: `Estimate ${label}` })
    load()
  }

  const handleDuplicate = async () => {
    const copy = await api.post<Estimate>(`/estimates/${id}/duplicate`, {})
    toast({ title: 'Estimate duplicated' })
    window.location.href = `/estimates/${copy.id}`
  }

  const handlePrint = () => {
    setShowPreview(true)
    setTimeout(() => window.print(), 300)
  }

  if (loading) return <div className="p-6"><div className="h-96 bg-muted rounded animate-pulse" /></div>
  if (!estimate) return <div className="p-6 text-muted-foreground">Estimate not found.</div>

  const canSend = estimate.status === 'draft'
  const canAccept = ['sent', 'under_review'].includes(estimate.status)
  const canReject = ['sent', 'under_review'].includes(estimate.status)

  const editValues: Partial<EstimateFormData> = {
    client_id: estimate.client_id,
    project_id: estimate.project_id ?? undefined,
    title: estimate.title,
    description: estimate.description ?? undefined,
    valid_until: estimate.valid_until ?? undefined,
    markup_pct: estimate.markup_pct,
    tax_pct: estimate.tax_pct,
    terms: estimate.terms ?? undefined,
    client_notes: estimate.client_notes ?? undefined,
  }

  return (
    <div className="p-6">
      {/* Print-only: full-page preview */}
      {showPreview && (
        <div className="hidden print:block">
          <EstimatePreview estimate={estimate} />
        </div>
      )}

      <div className="print:hidden">
        <PageHeader
          title={estimate.title}
          subtitle={
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{estimate.estimate_number}</span>
              <StatusBadge status={estimate.status} colorMap={ESTIMATE_STATUS_COLORS} />
            </span>
          }
          actions={
            <div className="flex gap-2 flex-wrap">
              <Link to="/estimates"><Button variant="outline" size="sm">← Estimates</Button></Link>
              <Button variant="outline" size="sm" onClick={handleDuplicate}><Copy className="h-4 w-4" /> Duplicate</Button>
              <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4" /> Print</Button>
              {canSend && <Button size="sm" variant="outline" onClick={() => doAction('send', 'sent')}><Send className="h-4 w-4" /> Mark Sent</Button>}
              {canAccept && <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => doAction('accept', 'accepted')}><CheckCircle className="h-4 w-4" /> Accept</Button>}
              {canReject && <Button size="sm" variant="destructive" onClick={() => doAction('reject', 'rejected')}><XCircle className="h-4 w-4" /> Reject</Button>}
              <Button size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>
            </div>
          }
        />

        {/* Meta */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
          {estimate.company_name && <span>{estimate.company_name}</span>}
          {estimate.contact_name && <span>· {estimate.contact_name}</span>}
          {estimate.valid_until && <span>Valid until {formatDate(estimate.valid_until)}</span>}
          {estimate.sent_at && <span>Sent {formatDate(estimate.sent_at)}</span>}
          {estimate.accepted_at && <span className="text-green-600">Accepted {formatDate(estimate.accepted_at)}</span>}
          {estimate.rejected_at && <span className="text-red-600">Rejected {formatDate(estimate.rejected_at)}</span>}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main editor */}
          <div className="xl:col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Line Items</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <LineItemTable
                  estimateId={estimate.id}
                  sections={estimate.sections ?? []}
                  lineItems={estimate.line_items ?? []}
                  onChange={load}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4">
                <EstimateSummary estimate={estimate} />
              </CardContent>
            </Card>

            {(estimate.client_notes || estimate.terms) && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Notes & Terms</CardTitle></CardHeader>
                <CardContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
                  {estimate.client_notes && <p className="whitespace-pre-wrap">{estimate.client_notes}</p>}
                  {estimate.terms && (
                    <div>
                      <div className="font-medium text-foreground text-xs uppercase tracking-wide mb-1">Terms</div>
                      <p className="whitespace-pre-wrap text-xs">{estimate.terms}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Preview panel */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Preview</CardTitle></CardHeader>
              <CardContent className="px-0 pb-0 overflow-hidden rounded-b-lg">
                <div className="transform scale-[0.45] origin-top-left w-[222%] pointer-events-none">
                  <EstimatePreview estimate={estimate} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <EstimateForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleEdit}
        clients={clients}
        projects={projects}
        initialValues={editValues}
        title="Edit Estimate"
      />
    </div>
  )
}
