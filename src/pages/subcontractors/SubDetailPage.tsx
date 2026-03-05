import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Subcontractor, SubcontractorBid, Document, Project } from '@/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileUpload, FileList } from '@/components/shared/FileUpload'
import { SubForm, type SubFormData } from '@/components/subcontractors/SubForm'
import { SubBidForm, type SubBidFormData } from '@/components/subcontractors/SubBidForm'
import { TradeTag } from '@/components/subcontractors/TradeTag'
import { toast } from '@/hooks/useToast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Pencil, Plus, Star, AlertTriangle, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import { MNComplianceTab } from '@/components/subcontractors/MNComplianceTab'

const BID_STATUS_COLORS: Record<string, string> = {
  invited: 'bg-blue-100 text-blue-700',
  received: 'bg-yellow-100 text-yellow-700',
  leveled: 'bg-purple-100 text-purple-700',
  awarded: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export function SubDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [sub, setSub] = useState<Subcontractor | null>(null)
  const [bids, setBids] = useState<SubcontractorBid[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [addBidOpen, setAddBidOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!id) return
    const [subData, bidData, docData] = await Promise.all([
      api.get<Subcontractor>(`/subcontractors/${id}`),
      api.get<SubcontractorBid[]>(`/subcontractors/${id}/bids`),
      api.get<Document[]>(`/documents?entity_type=subcontractor&entity_id=${id}`),
    ])
    setSub(subData)
    setBids(bidData)
    setDocuments(docData)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    api.get<Project[]>('/projects').then(setProjects)
  }, [])

  const handleEdit = async (data: SubFormData) => {
    await api.put(`/subcontractors/${id}`, data)
    toast({ title: 'Subcontractor updated' })
    setEditOpen(false)
    load()
  }

  const handleAddBid = async (data: SubBidFormData) => {
    await api.post(`/subcontractors/${id}/bids`, data)
    toast({ title: 'Bid added' })
    setAddBidOpen(false)
    load()
  }

  const deleteBid = async (bidId: number) => {
    await api.delete(`/subcontractors/${id}/bids/${bidId}`)
    toast({ title: 'Bid removed' })
    load()
  }

  if (loading) return <div className="p-6"><div className="h-96 bg-muted rounded animate-pulse" /></div>
  if (!sub) return <div className="p-6 text-muted-foreground">Subcontractor not found.</div>

  const today = new Date().toISOString().slice(0, 10)
  const insExpired = sub.insurance_expiry && sub.insurance_expiry < today
  const licExpired = sub.license_expiry && sub.license_expiry < today

  return (
    <div className="p-6">
      <PageHeader
        title={sub.company_name}
        subtitle={
          <span className="flex items-center gap-2">
            <TradeTag trade={sub.trade} />
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              sub.status === 'active' ? 'bg-green-100 text-green-700' :
              sub.status === 'do_not_use' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-600'
            }`}>{sub.status.replace('_', ' ')}</span>
            {sub.rating && (
              <span className="flex items-center gap-0.5 text-amber-500">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span className="text-xs text-foreground">{sub.rating}/5</span>
              </span>
            )}
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Link to="/subcontractors"><Button variant="outline" size="sm">← Subcontractors</Button></Link>
            <Button size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>
          </div>
        }
      />

      {/* Expiry warnings */}
      {(insExpired || licExpired) && (
        <div className="mb-4 flex gap-3">
          {insExpired && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
              <AlertTriangle className="h-4 w-4" />
              Insurance expired {formatDate(sub.insurance_expiry)}
            </div>
          )}
          {licExpired && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
              <AlertTriangle className="h-4 w-4" />
              License expired {formatDate(sub.license_expiry)}
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bids">Bids ({bids.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-1.5">
            <ComplianceIcon verifiedCount={sub.verified_count ?? null} />
            MN Compliance ({sub.verified_count ?? 0}/14)
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Contact Information</CardTitle></CardHeader>
                <CardContent className="px-4 pb-4 space-y-2 text-sm">
                  <Row label="Name" value={sub.contact_name} />
                  <Row label="Email" value={sub.contact_email} />
                  <Row label="Phone" value={sub.contact_phone} />
                  {(sub.city || sub.address) && (
                    <Row label="Address" value={[sub.address, sub.city, sub.state, sub.zip].filter(Boolean).join(', ')} />
                  )}
                </CardContent>
              </Card>
              {sub.notes && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-wrap">{sub.notes}</CardContent>
                </Card>
              )}
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Compliance</CardTitle></CardHeader>
                <CardContent className="px-4 pb-4 space-y-2 text-sm">
                  <Row label="License #" value={sub.license_number} />
                  <Row
                    label="License Exp"
                    value={sub.license_expiry ? formatDate(sub.license_expiry) : undefined}
                    highlight={licExpired ? 'red' : undefined}
                  />
                  <Row label="Ins. Carrier" value={sub.insurance_carrier} />
                  <Row
                    label="Ins. Expiry"
                    value={sub.insurance_expiry ? formatDate(sub.insurance_expiry) : undefined}
                    highlight={insExpired ? 'red' : undefined}
                  />
                  <Row label="Coverage" value={sub.insurance_amount ? formatCurrency(sub.insurance_amount) : undefined} />
                  <Row label="W-9 on File" value={sub.w9_on_file ? 'Yes' : 'No'} />
                  <Row label="Prequalified" value={sub.prequalified ? 'Yes' : 'No'} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* BIDS */}
        <TabsContent value="bids">
          <div className="mb-4 flex justify-end">
            <Button size="sm" onClick={() => setAddBidOpen(true)}>
              <Plus className="h-4 w-4" /> Add Bid
            </Button>
          </div>
          {bids.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No bids recorded yet.</div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Project</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Package</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Bid Amount</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Awarded</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bids.map(bid => (
                    <tr key={bid.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        {bid.project_id ? (
                          <Link to={`/projects/${bid.project_id}`} className="hover:text-primary">
                            {bid.project_number ?? `Project #${bid.project_id}`}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{bid.trade_package ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${BID_STATUS_COLORS[bid.bid_status] ?? ''}`}>
                          {bid.bid_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(bid.bid_amount)}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">{bid.awarded_amount ? formatCurrency(bid.awarded_amount) : '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteBid(bid.id)} className="text-muted-foreground/40 hover:text-destructive">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* DOCUMENTS */}
        <TabsContent value="documents">
          <div className="max-w-2xl space-y-4">
            <FileUpload
              entityType="subcontractor"
              entityId={sub.id}
              onUploaded={doc => setDocuments(prev => [doc, ...prev])}
            />
            <FileList
              documents={documents}
              onDeleted={docId => setDocuments(prev => prev.filter(d => d.id !== docId))}
            />
          </div>
        </TabsContent>

        {/* MN IC COMPLIANCE */}
        <TabsContent value="compliance">
          <MNComplianceTab sub={sub} />
        </TabsContent>
      </Tabs>

      <SubForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleEdit}
        initialValues={sub}
        title="Edit Subcontractor"
      />

      <SubBidForm
        open={addBidOpen}
        onOpenChange={setAddBidOpen}
        onSave={handleAddBid}
        projects={projects}
        title="Add Bid"
      />
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value?: string | null; highlight?: 'red' }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <span className={`font-medium text-right ${highlight === 'red' ? 'text-red-600' : ''}`}>{value ?? '—'}</span>
    </div>
  )
}

function ComplianceIcon({ verifiedCount }: { verifiedCount: number | null }) {
  if (verifiedCount === null || verifiedCount === undefined) return <ShieldX className="h-3.5 w-3.5 text-muted-foreground" />
  if (verifiedCount === 14) return <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
  if (verifiedCount >= 10) return <ShieldAlert className="h-3.5 w-3.5 text-yellow-500" />
  return <ShieldX className="h-3.5 w-3.5 text-red-500" />
}
