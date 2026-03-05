import { useState, useEffect, useRef, useCallback } from 'react'
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  FileText,
  ShieldCheck,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileUpload, FileList } from '@/components/shared/FileUpload'
import { api } from '@/lib/api'
import { toast } from '@/hooks/useToast'
import { cn, formatDate } from '@/lib/utils'
import type { Subcontractor, MNCompliance, Document } from '@/types'

// ---------------------------------------------------------------------------
// Criteria definitions
// ---------------------------------------------------------------------------

interface CriterionDef {
  n: number
  title: string
  description: string
  docHint: string
}

const CRITERIA: CriterionDef[] = [
  {
    n: 1,
    title: 'Separate Business Entity',
    description:
      'Established and maintained as a separate business entity (LLC, Corp, etc.) independent from the hiring contractor.',
    docHint: 'Upload: Articles of org/incorp, operating agreement',
  },
  {
    n: 2,
    title: 'Owns or Leases Tools / Equipment',
    description:
      'Business owns, rents, or leases its own tools, vehicles, equipment, materials, or workspace.',
    docHint: 'Upload: Equipment receipts, lease agreements',
  },
  {
    n: 3,
    title: 'Works for Multiple Clients',
    description:
      'Provides or offers services to multiple customers or the public — not exclusively to one contractor.',
    docHint: 'Upload: Client list, signed attestation',
  },
  {
    n: 4,
    title: 'Federal EIN',
    description: 'Has a Federal Employer Identification Number when required by law.',
    docHint: 'Upload: IRS EIN letter (CP575)',
  },
  {
    n: 5,
    title: 'Minnesota Tax ID',
    description: 'Holds a Minnesota tax identification number if required.',
    docHint: 'Upload: MN Revenue tax ID confirmation',
  },
  {
    n: 6,
    title: 'Receives 1099 Forms',
    description: 'Receives and retains 1099 forms when applicable.',
    docHint: 'Upload: Copy of most recent 1099-NEC',
  },
  {
    n: 7,
    title: 'Files Business Taxes',
    description:
      'Filed business or self-employment tax returns with the IRS and Minnesota Department of Revenue.',
    docHint: 'Upload: Federal/MN business tax return',
  },
  {
    n: 8,
    title: 'Written Contract',
    description: 'A written contract specifies the services to be performed.',
    docHint: 'Upload: Executed subcontract agreement',
  },
  {
    n: 9,
    title: 'Responsible for Completion',
    description:
      'Responsible for completing the work in the contract and liable if they fail to complete it.',
    docHint: 'Upload: Contract clause, addendum',
  },
  {
    n: 10,
    title: 'Control of Work',
    description: 'Controls the means and methods of how the work is performed.',
    docHint: 'Upload: Contract clause, attestation',
  },
  {
    n: 11,
    title: 'Can Realize Profit or Loss',
    description:
      'Can make a profit or suffer a financial loss depending on management of expenses.',
    docHint: 'Upload: Contract showing fixed-price or cost exposure',
  },
  {
    n: 12,
    title: 'Maintains Business Presence',
    description:
      'Maintains a business location or workspace separate from the hiring contractor.',
    docHint: 'Upload: Lease, utility bill, business address proof',
  },
  {
    n: 13,
    title: 'Insurance Requirements',
    description:
      "Carries required insurance: workers' compensation (if employees) and liability insurance.",
    docHint: 'Upload: Certificate of Insurance (COI)',
  },
  {
    n: 14,
    title: 'Holds Required Licenses',
    description:
      'Has any required construction licenses, registrations, or certifications.',
    docHint: 'Upload: License certificate',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function verifiedKey(n: number): keyof MNCompliance {
  return `criterion_${n}_verified` as keyof MNCompliance
}

function notesKey(n: number): keyof MNCompliance {
  return `criterion_${n}_notes` as keyof MNCompliance
}

function isExpiringSoon(dateStr: string | null | undefined, days = 90): boolean {
  if (!dateStr) return false
  const exp = new Date(dateStr)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + days)
  return exp <= cutoff
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  sub: Subcontractor
  onUpdated: (updated: Subcontractor) => void
  documents: Document[]
  onDocumentsChange: (docs: Document[]) => void
}

// ---------------------------------------------------------------------------
// Compliance Banner
// ---------------------------------------------------------------------------

function ComplianceBanner({ count }: { count: number }) {
  if (count === 14) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-300 p-4">
        <ShieldCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">Fully Compliant</p>
          <p className="text-xs text-green-700">All 14 criteria verified under MN §181.723.</p>
        </div>
        <Badge className="ml-auto bg-green-600 text-white">14 / 14</Badge>
      </div>
    )
  }
  if (count >= 10) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-yellow-50 border border-yellow-300 p-4">
        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-yellow-800">Partially Compliant</p>
          <p className="text-xs text-yellow-700">
            {14 - count} criteria still need to be verified.
          </p>
        </div>
        <Badge className="ml-auto bg-yellow-500 text-white">{count} / 14</Badge>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-300 p-4">
      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-red-800">Non-Compliant</p>
        <p className="text-xs text-red-700">
          Only {count} of 14 criteria verified. Action required.
        </p>
      </div>
      <Badge variant="destructive" className="ml-auto">
        {count} / 14
      </Badge>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Auto-hint component
// ---------------------------------------------------------------------------

function AutoHint({ n, sub }: { n: number; sub: Subcontractor }) {
  if (n === 4 && sub.federal_ein) {
    return (
      <p className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1">
        EIN on file: <span className="font-mono">{sub.federal_ein}</span>
      </p>
    )
  }
  if (n === 5 && sub.mn_tax_id) {
    return (
      <p className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1">
        MN Tax ID on file: <span className="font-mono">{sub.mn_tax_id}</span>
      </p>
    )
  }
  if (n === 12 && sub.address) {
    const full = [sub.address, sub.city, sub.state, sub.zip].filter(Boolean).join(', ')
    return (
      <p className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1">
        Address: {full}
      </p>
    )
  }
  if (n === 13 && sub.insurance_carrier) {
    const expiring = isExpiringSoon(sub.insurance_expiry)
    return (
      <p
        className={cn(
          'text-xs rounded px-2 py-1',
          expiring ? 'text-red-700 bg-red-50' : 'text-blue-700 bg-blue-50',
        )}
      >
        Carrier: {sub.insurance_carrier}
        {sub.insurance_expiry && (
          <>
            {' '}— expires {formatDate(sub.insurance_expiry)}
            {expiring && ' ⚠ Expiring soon'}
          </>
        )}
      </p>
    )
  }
  if (n === 14 && sub.license_number) {
    const expiring = isExpiringSoon(sub.license_expiry)
    return (
      <p
        className={cn(
          'text-xs rounded px-2 py-1',
          expiring ? 'text-red-700 bg-red-50' : 'text-blue-700 bg-blue-50',
        )}
      >
        License: {sub.license_number}
        {sub.license_expiry && (
          <>
            {' '}— expires {formatDate(sub.license_expiry)}
            {expiring && ' ⚠ Expiring soon'}
          </>
        )}
      </p>
    )
  }
  return null
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ComplianceChecklistSection({ sub, onUpdated, documents, onDocumentsChange }: Props) {
  const [compliance, setCompliance] = useState<MNCompliance | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get<MNCompliance>(`/subcontractors/${sub.id}/compliance`)
      .then((data) => {
        if (!cancelled) setCompliance(data)
      })
      .catch(() => {
        if (!cancelled)
          toast({
            title: 'Could not load compliance data',
            variant: 'destructive',
          })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sub.id])

  const scheduleSave = useCallback(
    (patch: Partial<MNCompliance>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        try {
          const updated = await api.put<MNCompliance>(
            `/subcontractors/${sub.id}/compliance`,
            patch,
          )
          setCompliance(updated)
          // Refresh the sub to pick up updated compliance_score / verified_count
          const updatedSub = await api.get<Subcontractor>(`/subcontractors/${sub.id}`)
          onUpdated(updatedSub)
        } catch {
          toast({
            title: 'Auto-save failed',
            description: 'Could not save compliance data.',
            variant: 'destructive',
          })
        }
      }, 600)
    },
    [sub.id, onUpdated],
  )

  function toggleExpanded(n: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  function handleVerify(n: number, currentValue: number) {
    const newValue = currentValue === 1 ? 0 : 1
    const key = verifiedKey(n)
    const patch = { [key]: newValue } as Partial<MNCompliance>
    setCompliance((prev) => (prev ? { ...prev, ...patch } : prev))
    scheduleSave(patch)
  }

  function handleNotesChange(n: number, value: string) {
    const key = notesKey(n)
    setCompliance((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function handleNotesBlur(n: number, value: string) {
    const key = notesKey(n)
    scheduleSave({ [key]: value || null } as Partial<MNCompliance>)
  }

  function handleUploaded(doc: Document) {
    onDocumentsChange([...documents, doc])
  }

  function handleDeleted(id: number) {
    onDocumentsChange(documents.filter((d) => d.id !== id))
  }

  const verifiedCount = compliance
    ? CRITERIA.filter((c) => (compliance[verifiedKey(c.n)] as number) === 1).length
    : (sub.verified_count ?? 0)

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading compliance checklist…
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <ComplianceBanner count={verifiedCount} />

      {CRITERIA.map((criterion) => {
        const isOpen = expanded.has(criterion.n)
        const isVerified = compliance
          ? (compliance[verifiedKey(criterion.n)] as number) === 1
          : false
        const notes = compliance
          ? ((compliance[notesKey(criterion.n)] as string | null | undefined) ?? '')
          : ''
        const criterionDocs = documents.filter(
          (d) => d.compliance_criterion === criterion.n,
        )

        return (
          <Card
            key={criterion.n}
            className={cn(
              'transition-colors border',
              isVerified ? 'border-green-300' : 'border-border',
            )}
          >
            {/* Collapsed header */}
            <button
              type="button"
              className="w-full text-left"
              onClick={() => toggleExpanded(criterion.n)}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                {isVerified ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <span className="text-xs font-mono text-muted-foreground w-6 flex-shrink-0">
                  {criterion.n}
                </span>
                <span className="flex-1 text-sm font-medium">{criterion.title}</span>
                {criterionDocs.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    {criterionDocs.length}
                  </span>
                )}
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Expanded body */}
            {isOpen && (
              <CardContent className="pt-0 pb-4 space-y-4">
                <div className="border-t pt-4 space-y-3">
                  {/* Description */}
                  <p className="text-sm text-muted-foreground">{criterion.description}</p>

                  {/* Auto-hint */}
                  <AutoHint n={criterion.n} sub={sub} />

                  {/* Notes */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Notes</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => handleNotesChange(criterion.n, e.target.value)}
                      onBlur={(e) => handleNotesBlur(criterion.n, e.target.value)}
                      placeholder="Add verification notes…"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  {/* Document upload */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">{criterion.docHint}</p>
                    <FileUpload
                      entityType="subcontractor"
                      entityId={sub.id}
                      complianceCriterion={criterion.n}
                      onUploaded={handleUploaded}
                    />
                    {criterionDocs.length > 0 && (
                      <FileList documents={criterionDocs} onDeleted={handleDeleted} />
                    )}
                  </div>

                  {/* Verify toggle */}
                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      variant={isVerified ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        handleVerify(
                          criterion.n,
                          compliance ? (compliance[verifiedKey(criterion.n)] as number) : 0,
                        )
                      }
                      className={cn(
                        isVerified &&
                          'bg-green-600 hover:bg-green-700 border-green-600 text-white',
                      )}
                    >
                      {isVerified ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                          Verified
                        </>
                      ) : (
                        <>
                          <Circle className="h-3.5 w-3.5 mr-1.5" />
                          Mark as Verified
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
