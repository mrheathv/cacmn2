import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Subcontractor } from '@/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { SubForm, type SubFormData } from '@/components/subcontractors/SubForm'
import { TradeTag } from '@/components/subcontractors/TradeTag'
import { SearchInput } from '@/components/shared/SearchInput'
import { formatDate } from '@/lib/utils'
import { toast } from '@/hooks/useToast'
import { Plus, HardHat, AlertTriangle, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  do_not_use: 'bg-red-100 text-red-700',
}

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
}

const BUSINESS_STRUCTURE_LABELS: Record<string, string> = {
  sole_prop: 'Sole Prop',
  llc: 'LLC',
  corporation: 'Corp',
  partnership: 'Partnership',
}

const TRADE_FILTERS = ['all', 'electrical', 'plumbing', 'hvac', 'concrete', 'carpentry', 'roofing', 'drywall', 'painting', 'other']

export function SubcontractorsPage() {
  const [subs, setSubs] = useState<Subcontractor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tradeFilter, setTradeFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    const data = await api.get<Subcontractor[]>('/subcontractors')
    setSubs(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (data: SubFormData) => {
    try {
      await api.post('/subcontractors', data)
      toast({ title: 'Subcontractor added' })
      setCreateOpen(false)
      load()
    } catch (e) {
      toast({ title: 'Error adding subcontractor', description: String(e), variant: 'destructive' })
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  const filtered = subs.filter(s => {
    const matchTrade = tradeFilter === 'all' || s.trade === tradeFilter
    const q = search.toLowerCase()
    const matchSearch = !q || s.company_name.toLowerCase().includes(q) ||
      (s.contact_name ?? '').toLowerCase().includes(q) ||
      (s.business_email ?? '').toLowerCase().includes(q) ||
      s.trade.toLowerCase().includes(q)
    return matchTrade && matchSearch
  })

  if (loading) return <div className="p-6"><div className="h-96 bg-muted rounded animate-pulse" /></div>

  return (
    <div className="p-6">
      <PageHeader
        title="Subcontractors"
        subtitle={`${subs.length} total`}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Add Subcontractor
          </Button>
        }
      />

      {/* Trade filter */}
      <div className="flex gap-1 mb-4 border-b overflow-x-auto">
        {TRADE_FILTERS.map(t => (
          <button
            key={t}
            onClick={() => setTradeFilter(t)}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
              tradeFilter === t
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'all' ? 'All Trades' : t.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search subcontractors…" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title="No subcontractors found"
          description={search || tradeFilter !== 'all' ? 'Try adjusting your filters.' : 'Add your first subcontractor to get started.'}
          action={!search && tradeFilter === 'all'
            ? <Button size="sm" onClick={() => setCreateOpen(true)}>Add Subcontractor</Button>
            : undefined}
        />
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trade</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Structure</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Risk</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">MN Compliance</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Insurance Exp.</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(s => {
                const insExpired = s.insurance_expiry && s.insurance_expiry < today
                const licExpired = s.license_expiry && s.license_expiry < today
                return (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link to={`/subcontractors/${s.id}`} className="font-medium hover:text-primary">{s.company_name}</Link>
                      {s.dba_name && <div className="text-xs text-muted-foreground">{s.dba_name}</div>}
                    </td>
                    <td className="px-4 py-3"><TradeTag trade={s.trade} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {s.business_structure ? BUSINESS_STRUCTURE_LABELS[s.business_structure] ?? s.business_structure : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[s.status] ?? ''}`}>
                        {s.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.risk_level ? (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RISK_COLORS[s.risk_level] ?? ''}`}>
                          {s.risk_level.charAt(0).toUpperCase() + s.risk_level.slice(1)}
                        </span>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <ComplianceBadge verifiedCount={s.verified_count ?? null} />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {s.insurance_expiry ? (
                        <span className={insExpired ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                          {insExpired ? '⚠ ' : ''}Exp {formatDate(s.insurance_expiry)}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {s.prequalified ? <span className="text-xs text-green-600 font-medium">Prequal</span> : null}
                        {s.w9_on_file ? <span className="text-xs text-blue-600">W-9</span> : null}
                        {(insExpired || licExpired) ? <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <SubForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleCreate}
        title="Add Subcontractor"
      />
    </div>
  )
}

function ComplianceBadge({ verifiedCount }: { verifiedCount: number | null }) {
  if (verifiedCount === null || verifiedCount === undefined) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ShieldX className="h-3.5 w-3.5" />
        Not started
      </span>
    )
  }
  if (verifiedCount === 14) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
        <ShieldCheck className="h-3.5 w-3.5" />
        Compliant
      </span>
    )
  }
  if (verifiedCount >= 10) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-yellow-700 font-medium">
        <ShieldAlert className="h-3.5 w-3.5" />
        {verifiedCount}/14
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
      <ShieldX className="h-3.5 w-3.5" />
      {verifiedCount}/14
    </span>
  )
}
