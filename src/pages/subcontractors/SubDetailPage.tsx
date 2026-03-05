import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Subcontractor, SubcontractorBid, Document, Project, SubcontractorLicense, SubcontractorInsurancePolicy } from '@/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { FileUpload, FileList } from '@/components/shared/FileUpload'
import { SubForm, type SubFormData } from '@/components/subcontractors/SubForm'
import { SubBidForm, type SubBidFormData } from '@/components/subcontractors/SubBidForm'
import { TradeTag } from '@/components/subcontractors/TradeTag'
import { toast } from '@/hooks/useToast'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Building2, Users, FileText, Shield, Briefcase, Wrench,
  CheckSquare, AlertOctagon, CreditCard, FolderOpen, ClipboardList,
  Pencil, Plus, Star, ShieldCheck, ShieldAlert, ShieldX, Link as LinkIcon
} from 'lucide-react'
import { BusinessProfileSection } from '@/components/subcontractors/sections/BusinessProfileSection'
import { OwnersSection } from '@/components/subcontractors/sections/OwnersSection'
import { TaxComplianceSection } from '@/components/subcontractors/sections/TaxComplianceSection'
import { LicensingSection } from '@/components/subcontractors/sections/LicensingSection'
import { InsuranceSection } from '@/components/subcontractors/sections/InsuranceSection'
import { ContractsSection } from '@/components/subcontractors/sections/ContractsSection'
import { OperationalSection } from '@/components/subcontractors/sections/OperationalSection'
import { ComplianceChecklistSection } from '@/components/subcontractors/sections/ComplianceChecklistSection'
import { RiskStatusSection } from '@/components/subcontractors/sections/RiskStatusSection'
import { PaymentSection } from '@/components/subcontractors/sections/PaymentSection'

type SectionKey =
  | 'profile' | 'owners' | 'tax' | 'licensing' | 'insurance'
  | 'contracts' | 'operational' | 'compliance' | 'risk' | 'payment'
  | 'documents' | 'bids'

interface NavItem {
  key: SectionKey
  label: string
  icon: React.ElementType
  group?: 'main' | 'records'
}

const NAV_ITEMS: NavItem[] = [
  { key: 'profile',     label: 'Business Profile',      icon: Building2,    group: 'main' },
  { key: 'owners',      label: 'Owners / Principals',   icon: Users,        group: 'main' },
  { key: 'tax',         label: 'Tax Compliance',         icon: FileText,     group: 'main' },
  { key: 'licensing',   label: 'Licensing',              icon: Shield,       group: 'main' },
  { key: 'insurance',   label: 'Insurance',              icon: Briefcase,    group: 'main' },
  { key: 'contracts',   label: 'Contracts',              icon: ClipboardList,group: 'main' },
  { key: 'operational', label: 'Operational Independence',icon: Wrench,      group: 'main' },
  { key: 'compliance',  label: 'MN IC Compliance',       icon: CheckSquare,  group: 'main' },
  { key: 'risk',        label: 'Risk Status',            icon: AlertOctagon, group: 'main' },
  { key: 'payment',     label: 'Payment & Reporting',    icon: CreditCard,   group: 'main' },
  { key: 'documents',   label: 'Documents',              icon: FolderOpen,   group: 'records' },
  { key: 'bids',        label: 'Bids',                   icon: LinkIcon,     group: 'records' },
]

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
  const [activeSection, setActiveSection] = useState<SectionKey>('profile')
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
  useEffect(() => { api.get<Project[]>('/projects').then(setProjects) }, [])

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
    if (!window.confirm('Remove this bid?')) return
    await api.delete(`/subcontractors/${id}/bids/${bidId}`)
    toast({ title: 'Bid removed' })
    load()
  }

  if (loading) return <div className="p-6"><div className="h-96 bg-muted rounded animate-pulse" /></div>
  if (!sub) return <div className="p-6 text-muted-foreground">Subcontractor not found.</div>

  const licenses = (sub.licenses ?? []) as SubcontractorLicense[]
  const insurancePolicies = (sub.insurance_policies ?? []) as SubcontractorInsurancePolicy[]
  const verifiedCount = sub.verified_count ?? 0

  return (
    <div className="p-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {sub.company_name}
            {sub.dba_name && <span className="text-base font-normal text-muted-foreground">({sub.dba_name})</span>}
          </span>
        }
        subtitle={
          <span className="flex items-center gap-2 flex-wrap">
            <TradeTag trade={sub.trade} />
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              sub.status === 'active' ? 'bg-green-100 text-green-700' :
              sub.status === 'do_not_use' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-600'
            }`}>{sub.status.replace('_', ' ')}</span>
            <RiskBadge level={sub.risk_level ?? null} />
            {sub.rating && (
              <span className="flex items-center gap-0.5 text-amber-500">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span className="text-xs text-foreground">{sub.rating}/5</span>
              </span>
            )}
            <CompliancePill verifiedCount={verifiedCount} />
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Link to="/subcontractors"><Button variant="outline" size="sm">← Subcontractors</Button></Link>
            <Button size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>
          </div>
        }
      />

      <div className="flex gap-6 mt-4">
        {/* Sidebar Nav */}
        <nav className="w-52 flex-shrink-0">
          <div className="sticky top-4 space-y-1">
            {NAV_ITEMS.filter(n => n.group === 'main').map(item => (
              <NavButton key={item.key} item={item} active={activeSection === item.key} onClick={() => setActiveSection(item.key)} />
            ))}
            <div className="border-t my-2" />
            {NAV_ITEMS.filter(n => n.group === 'records').map(item => (
              <NavButton key={item.key} item={item} active={activeSection === item.key} onClick={() => setActiveSection(item.key)}
                badge={item.key === 'bids' ? bids.length : item.key === 'documents' ? documents.length : undefined}
              />
            ))}
          </div>
        </nav>

        {/* Section Content */}
        <div className="flex-1 min-w-0">
          {activeSection === 'profile' && (
            <BusinessProfileSection
              sub={sub}
              onUpdated={setSub}
              documents={documents.filter(d => d.compliance_criterion == null)}
              onDocumentsChange={docs => setDocuments(prev => [...prev.filter(d => d.compliance_criterion != null), ...docs])}
            />
          )}
          {activeSection === 'owners' && (
            <OwnersSection sub={sub} onUpdated={setSub} />
          )}
          {activeSection === 'tax' && (
            <TaxComplianceSection
              sub={sub}
              onUpdated={setSub}
              documents={documents}
              onDocumentsChange={setDocuments}
            />
          )}
          {activeSection === 'licensing' && (
            <LicensingSection sub={sub} />
          )}
          {activeSection === 'insurance' && (
            <InsuranceSection sub={sub} />
          )}
          {activeSection === 'contracts' && (
            <ContractsSection sub={sub} />
          )}
          {activeSection === 'operational' && (
            <OperationalSection
              sub={sub}
              onUpdated={setSub}
              documents={documents.filter(d => d.compliance_criterion == null)}
              onDocumentsChange={docs => setDocuments(prev => [...prev.filter(d => d.compliance_criterion != null), ...docs])}
            />
          )}
          {activeSection === 'compliance' && (
            <ComplianceChecklistSection
              sub={sub}
              onUpdated={setSub}
              documents={documents}
              onDocumentsChange={setDocuments}
            />
          )}
          {activeSection === 'risk' && (
            <RiskStatusSection
              sub={sub}
              onUpdated={setSub}
              licenses={licenses}
              policies={insurancePolicies}
            />
          )}
          {activeSection === 'payment' && (
            <PaymentSection sub={sub} onUpdated={setSub} />
          )}
          {activeSection === 'documents' && (
            <div className="max-w-2xl space-y-4">
              <h2 className="text-base font-semibold">All Documents</h2>
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
          )}
          {activeSection === 'bids' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-base font-semibold">Bids</h2>
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
                          <td className="px-4 py-3 text-right">{bid.bid_amount ? formatCurrency(bid.bid_amount) : '—'}</td>
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
            </div>
          )}
        </div>
      </div>

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

function NavButton({ item, active, onClick, badge }: {
  item: NavItem; active: boolean; onClick: () => void; badge?: number
}) {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
        active
          ? 'bg-primary text-primary-foreground font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`text-xs rounded-full px-1.5 py-0.5 font-medium ${
          active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted-foreground/20'
        }`}>{badge}</span>
      )}
    </button>
  )
}

function RiskBadge({ level }: { level: 'low' | 'medium' | 'high' | null }) {
  if (!level) return null
  const map = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[level]}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)} Risk
    </span>
  )
}

function CompliancePill({ verifiedCount }: { verifiedCount: number }) {
  if (verifiedCount === 14) return (
    <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
      <ShieldCheck className="h-3.5 w-3.5" /> {verifiedCount}/14
    </span>
  )
  if (verifiedCount >= 10) return (
    <span className="inline-flex items-center gap-1 text-xs text-yellow-600 font-medium">
      <ShieldAlert className="h-3.5 w-3.5" /> {verifiedCount}/14
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <ShieldX className="h-3.5 w-3.5" /> {verifiedCount}/14
    </span>
  )
}
