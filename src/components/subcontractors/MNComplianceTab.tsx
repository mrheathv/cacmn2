import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import type { Subcontractor, MNCompliance, Document } from '@/types'
import { FileUpload, FileList } from '@/components/shared/FileUpload'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/utils'
import { CheckCircle2, Circle, ChevronDown, ChevronRight, AlertTriangle, ShieldCheck, ShieldX, ShieldAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface MNComplianceTabProps {
  sub: Subcontractor
}

interface CriterionDef {
  n: number
  title: string
  description: string
  hint?: string
  docHint?: string
}

const CRITERIA: CriterionDef[] = [
  {
    n: 1,
    title: 'Separate Business Entity',
    description: 'The subcontractor must be established and maintained as a separate business entity (LLC, Corporation, etc.) independent from the hiring contractor.',
    hint: 'Upload: Articles of incorporation, operating agreement, or certificate of organization.',
    docHint: 'Articles of incorp, operating agreement',
  },
  {
    n: 2,
    title: 'Owns or Leases Tools / Equipment',
    description: 'The business owns, rents, or leases its own tools, vehicles, equipment, materials, or workspace used for the job.',
    hint: 'Upload: Equipment purchase receipts, lease/rental agreements, vehicle registration.',
    docHint: 'Equipment receipts, rental agreements',
  },
  {
    n: 3,
    title: 'Works for Multiple Clients',
    description: 'The subcontractor provides or offers services to multiple customers or the general public — not exclusively to one contractor.',
    hint: 'Upload: Client list, signed attestation, marketing materials, other contracts.',
    docHint: 'Client list, signed attestation',
  },
  {
    n: 4,
    title: 'Federal EIN (if required)',
    description: 'The business must have a Federal Employer Identification Number when required by law.',
    hint: 'Upload: IRS EIN assignment letter (CP 575).',
    docHint: 'IRS EIN letter (CP 575)',
  },
  {
    n: 5,
    title: 'Minnesota Tax ID',
    description: 'Must hold a Minnesota tax identification number if required.',
    hint: 'Upload: MN Department of Revenue tax ID confirmation.',
    docHint: 'MN Revenue tax ID confirmation',
  },
  {
    n: 6,
    title: 'Receives 1099 Forms',
    description: 'The business must receive and retain 1099 forms when applicable.',
    hint: 'Upload: Copy of most recent 1099-NEC or 1099-MISC form.',
    docHint: '1099-NEC or 1099-MISC copy',
  },
  {
    n: 7,
    title: 'Files Business Taxes',
    description: 'Must have filed business or self-employment tax returns with the IRS and Minnesota Department of Revenue.',
    hint: 'Upload: Most recent federal Schedule C, Form 1120, or 1065; MN M1 or M8 return.',
    docHint: 'Federal/MN business tax return',
  },
  {
    n: 8,
    title: 'Written Contract',
    description: 'There must be a written contract specifying the services to be performed.',
    hint: 'Upload the executed subcontract agreement for this engagement.',
    docHint: 'Executed subcontract agreement',
  },
  {
    n: 9,
    title: 'Responsible for Completion of Work',
    description: 'The subcontractor is responsible for completing the work in the contract and is liable if they fail to complete it.',
    hint: 'Addressed in the contract language — upload contract or signed addendum confirming liability.',
    docHint: 'Contract clause, signed addendum',
  },
  {
    n: 10,
    title: 'Control of Work',
    description: 'The subcontractor controls the means and methods of how the work is performed — not the hiring contractor.',
    hint: 'Addressed in contract language. Upload contracts or a written attestation.',
    docHint: 'Contract clause, attestation',
  },
  {
    n: 11,
    title: 'Can Realize Profit or Loss',
    description: 'The subcontractor can make a profit or suffer a financial loss depending on their management of expenses.',
    hint: 'Addressed in contract language (fixed-price or cost-plus). Upload contract.',
    docHint: 'Contract, signed attestation',
  },
  {
    n: 12,
    title: 'Maintains Business Presence',
    description: 'The business maintains a business location, office, or workspace that is separate from the hiring contractor\'s premises.',
    hint: 'Upload: Lease, utility bill, or other proof of a separate business address.',
    docHint: 'Lease, utility bill, business address proof',
  },
  {
    n: 13,
    title: 'Insurance Requirements',
    description: 'The subcontractor carries required insurance: workers\' compensation (if they have employees) and liability insurance where applicable.',
    hint: 'Upload: Certificate of Insurance (COI) for general liability and workers\' comp.',
    docHint: 'Certificate of Insurance (COI)',
  },
  {
    n: 14,
    title: 'Holds Required Licenses',
    description: 'The subcontractor must have any required construction licenses, registrations, or certifications.',
    hint: 'Upload: State contractor license, specialty licenses, registrations.',
    docHint: 'Contractor license, specialty certs',
  },
]

const ENTITY_TYPE_LABELS: Record<string, string> = {
  llc: 'LLC',
  corporation: 'Corporation',
  sole_prop: 'Sole Proprietorship',
  partnership: 'Partnership',
  other: 'Other',
}

export function MNComplianceTab({ sub }: MNComplianceTabProps) {
  const [compliance, setCompliance] = useState<MNCompliance | null>(null)
  const [docs, setDocs] = useState<Document[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    const [compData, docData] = await Promise.all([
      api.get<MNCompliance>(`/subcontractors/${sub.id}/compliance`),
      api.get<Document[]>(`/documents?entity_type=subcontractor&entity_id=${sub.id}`),
    ])
    // Normalize: ensure all criterion_N_verified fields exist (0 if absent)
    const defaults: MNCompliance = {
      subcontractor_id: sub.id,
      criterion_1_verified: 0,
      criterion_2_verified: 0,
      criterion_3_verified: 0,
      criterion_4_verified: 0,
      criterion_5_verified: 0,
      criterion_6_verified: 0,
      criterion_7_verified: 0,
      criterion_8_verified: 0,
      criterion_9_verified: 0,
      criterion_10_verified: 0,
      criterion_11_verified: 0,
      criterion_12_verified: 0,
      criterion_13_verified: 0,
      criterion_14_verified: 0,
    }
    const normalized: MNCompliance = { ...defaults, ...compData }
    setCompliance(normalized)
    setDocs(docData.filter((d) => d.compliance_criterion != null))
  }, [sub.id])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (patch: Partial<MNCompliance>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        const updated = await api.put<MNCompliance>(`/subcontractors/${sub.id}/compliance`, patch)
        setCompliance(prev => prev ? { ...prev, ...updated } : updated)
      } catch {
        toast({ title: 'Failed to save compliance data', variant: 'destructive' })
      }
      setSaving(false)
    }, 600)
  }, [sub.id])

  const toggleVerified = (n: number, current: number) => {
    const key = `criterion_${n}_verified` as keyof MNCompliance
    const newVal = current ? 0 : 1
    setCompliance(prev => prev ? { ...prev, [key]: newVal } : prev)
    save({ [key]: Boolean(newVal) })
  }

  const saveNotes = (n: number, value: string) => {
    const key = `criterion_${n}_notes` as keyof MNCompliance
    setCompliance(prev => prev ? { ...prev, [key]: value } : prev)
    save({ [key]: value })
  }

  const saveField = (field: keyof MNCompliance, value: string | null) => {
    setCompliance(prev => prev ? { ...prev, [field]: value } : prev)
    save({ [field]: value })
  }

  if (!compliance) {
    return <div className="h-48 bg-muted rounded animate-pulse" />
  }

  const verifiedCount = CRITERIA.reduce((sum, c) => {
    const key = `criterion_${c.n}_verified` as keyof MNCompliance
    return sum + (compliance[key] ? 1 : 0)
  }, 0)

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <ComplianceBanner verifiedCount={verifiedCount} saving={saving} />

      {/* Criterion Cards */}
      {CRITERIA.map((criterion) => {
        const verifiedKey = `criterion_${criterion.n}_verified` as keyof MNCompliance
        const notesKey = `criterion_${criterion.n}_notes` as keyof MNCompliance
        const isVerified = Boolean(compliance[verifiedKey])
        const notes = (compliance[notesKey] as string | null) ?? ''
        const isExpanded = expanded === criterion.n
        const criterionDocs = docs.filter(d => d.compliance_criterion === criterion.n)

        // Auto-hint data from existing sub fields
        let autoHint: string | null = null
        if (criterion.n === 12 && sub.address) {
          autoHint = `Address on file: ${[sub.address, sub.city, sub.state, sub.zip].filter(Boolean).join(', ')}`
        }
        if (criterion.n === 13) {
          if (sub.insurance_expiry && sub.insurance_expiry >= today) {
            autoHint = `General liability active — expires ${formatDate(sub.insurance_expiry)}`
          } else if (sub.insurance_expiry) {
            autoHint = `General liability EXPIRED ${formatDate(sub.insurance_expiry)}`
          }
        }
        if (criterion.n === 14) {
          if (sub.license_number && sub.license_expiry && sub.license_expiry >= today) {
            autoHint = `License ${sub.license_number} active — expires ${formatDate(sub.license_expiry)}`
          } else if (sub.license_number) {
            autoHint = sub.license_expiry
              ? `License ${sub.license_number} EXPIRED ${formatDate(sub.license_expiry)}`
              : `License on file: ${sub.license_number}`
          }
        }

        return (
          <Card key={criterion.n} className={isVerified ? 'border-green-200' : ''}>
            <CardHeader className="py-3 px-4">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleVerified(criterion.n, isVerified ? 1 : 0)}
                  className="flex-shrink-0 mt-0.5"
                  title={isVerified ? 'Mark as not verified' : 'Mark as verified'}
                >
                  {isVerified
                    ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                    : <Circle className="h-5 w-5 text-muted-foreground/40" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <button
                    className="flex items-center gap-1 w-full text-left"
                    onClick={() => setExpanded(isExpanded ? null : criterion.n)}
                  >
                    <span className="text-xs font-semibold text-muted-foreground w-5">{criterion.n}.</span>
                    <CardTitle className="text-sm font-medium flex-1">{criterion.title}</CardTitle>
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    }
                  </button>
                  {!isExpanded && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{criterion.description}</p>
                  )}
                  {autoHint && !isExpanded && (
                    <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                      <span className="font-medium">Auto:</span> {autoHint}
                    </p>
                  )}
                  {criterionDocs.length > 0 && !isExpanded && (
                    <p className="text-xs text-muted-foreground mt-0.5">{criterionDocs.length} document{criterionDocs.length !== 1 ? 's' : ''} attached</p>
                  )}
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="px-4 pb-4 border-t pt-3 space-y-3">
                <p className="text-sm text-muted-foreground">{criterion.description}</p>

                {autoHint && (
                  <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                    <span className="font-semibold">System data:</span> {autoHint}
                  </div>
                )}

                {/* Criterion-specific extra fields */}
                {criterion.n === 1 && (
                  <div>
                    <Label className="text-xs">Business Entity Type</Label>
                    <Select
                      value={compliance.entity_type ?? ''}
                      onValueChange={v => saveField('entity_type', v || null)}
                    >
                      <SelectTrigger className="h-8 text-sm mt-1">
                        <SelectValue placeholder="Select entity type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ENTITY_TYPE_LABELS).map(([v, label]) => (
                          <SelectItem key={v} value={v}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {criterion.n === 4 && (
                  <div>
                    <Label className="text-xs">Federal EIN (format: XX-XXXXXXX)</Label>
                    <Input
                      className="h-8 text-sm mt-1"
                      placeholder="12-3456789"
                      defaultValue={compliance.federal_ein ?? ''}
                      onBlur={e => saveField('federal_ein', e.target.value || null)}
                    />
                  </div>
                )}

                {criterion.n === 5 && (
                  <div>
                    <Label className="text-xs">Minnesota Tax ID</Label>
                    <Input
                      className="h-8 text-sm mt-1"
                      placeholder="MN Tax ID number"
                      defaultValue={compliance.mn_tax_id ?? ''}
                      onBlur={e => saveField('mn_tax_id', e.target.value || null)}
                    />
                  </div>
                )}

                {criterion.n === 13 && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Workers' Comp Carrier</Label>
                      <Input
                        className="h-8 text-sm mt-1"
                        placeholder="Carrier name"
                        defaultValue={compliance.workers_comp_carrier ?? ''}
                        onBlur={e => saveField('workers_comp_carrier', e.target.value || null)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Policy Number</Label>
                      <Input
                        className="h-8 text-sm mt-1"
                        placeholder="Policy #"
                        defaultValue={compliance.workers_comp_policy ?? ''}
                        onBlur={e => saveField('workers_comp_policy', e.target.value || null)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Expiry Date</Label>
                      <Input
                        type="date"
                        className="h-8 text-sm mt-1"
                        defaultValue={compliance.workers_comp_expiry?.slice(0, 10) ?? ''}
                        onBlur={e => saveField('workers_comp_expiry', e.target.value || null)}
                      />
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <Label className="text-xs">Notes / Evidence Description</Label>
                  <Textarea
                    className="text-sm mt-1"
                    rows={2}
                    placeholder={`e.g. ${criterion.docHint ?? 'Document received and on file'}`}
                    defaultValue={notes}
                    onBlur={e => saveNotes(criterion.n, e.target.value)}
                  />
                </div>

                {/* Documents */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Supporting Documents
                  </p>
                  {criterion.hint && (
                    <p className="text-xs text-muted-foreground mb-2 italic">{criterion.hint}</p>
                  )}
                  <FileUpload
                    entityType="subcontractor"
                    entityId={sub.id}
                    complianceCriterion={criterion.n}
                    onUploaded={doc => setDocs(prev => [doc, ...prev])}
                    className="py-4"
                  />
                  {criterionDocs.length > 0 && (
                    <FileList
                      documents={criterionDocs}
                      onDeleted={docId => setDocs(prev => prev.filter(d => d.id !== docId))}
                      className="mt-2"
                    />
                  )}
                </div>

                {/* Verified toggle button */}
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    variant={isVerified ? 'outline' : 'default'}
                    onClick={() => toggleVerified(criterion.n, isVerified ? 1 : 0)}
                    className={isVerified ? 'text-green-700 border-green-300 hover:bg-green-50' : ''}
                  >
                    {isVerified ? (
                      <><CheckCircle2 className="h-4 w-4 mr-1" /> Verified</>
                    ) : (
                      <><Circle className="h-4 w-4 mr-1" /> Mark as Verified</>
                    )}
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}

      <p className="text-xs text-muted-foreground text-center pb-4">
        Minnesota Statute §181.723 — All 14 criteria must be satisfied for independent contractor classification.
      </p>
    </div>
  )
}

function ComplianceBanner({ verifiedCount, saving }: { verifiedCount: number; saving: boolean }) {
  if (verifiedCount === 14) {
    return (
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
        <ShieldCheck className="h-6 w-6 text-green-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-green-800">Fully Compliant — MN §181.723</p>
          <p className="text-xs text-green-700">All 14 criteria satisfied. Safe to engage as an independent contractor.</p>
        </div>
        <span className="text-sm font-bold text-green-700">14 / 14</span>
        {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
      </div>
    )
  }
  if (verifiedCount >= 10) {
    return (
      <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
        <ShieldAlert className="h-6 w-6 text-yellow-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-yellow-800">Partially Compliant</p>
          <p className="text-xs text-yellow-700">{14 - verifiedCount} criteria still outstanding. All 14 must be met before engaging.</p>
        </div>
        <span className="text-sm font-bold text-yellow-700">{verifiedCount} / 14</span>
        {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
      <ShieldX className="h-6 w-6 text-red-600 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-800">
          {verifiedCount === 0 ? 'Compliance Not Started' : 'Non-Compliant'}
        </p>
        <p className="text-xs text-red-700">
          {verifiedCount === 0
            ? 'Complete the checklist below to verify MN §181.723 independent contractor status.'
            : `${14 - verifiedCount} criteria outstanding — risk of employee reclassification.`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <span className="text-sm font-bold text-red-700">{verifiedCount} / 14</span>
      </div>
      {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
    </div>
  )
}
