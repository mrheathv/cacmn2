import { useEffect, useState, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, AlertTriangle, Info, ChevronDown, ChevronUp, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileUpload, FileList } from '@/components/shared/FileUpload'
import { api } from '@/lib/api'
import { toast } from '@/hooks/useToast'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Subcontractor, SubcontractorInsurancePolicy, Document } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLICY_TYPE_LABELS: Record<SubcontractorInsurancePolicy['policy_type'], string> = {
  general_liability: 'General Liability',
  workers_comp: "Workers' Compensation",
  commercial_auto: 'Commercial Auto',
  umbrella: 'Umbrella / Excess',
  builders_risk: "Builder's Risk",
  other: 'Other',
}

const POLICY_TYPE_ORDER: SubcontractorInsurancePolicy['policy_type'][] = [
  'general_liability',
  'workers_comp',
  'commercial_auto',
  'umbrella',
  'builders_risk',
  'other',
]

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const schema = z.object({
  policy_type: z.enum([
    'general_liability',
    'workers_comp',
    'commercial_auto',
    'umbrella',
    'builders_risk',
    'other',
  ]),
  carrier: z.string().min(1, 'Carrier is required'),
  policy_number: z.string().nullable().optional(),
  coverage_amount: z
    .number({ invalid_type_error: 'Must be a number' })
    .positive('Must be positive')
    .nullable()
    .optional(),
  effective_date: z.string().nullable().optional(),
  expiration_date: z.string().nullable().optional(),
  num_employees_covered: z
    .number({ invalid_type_error: 'Must be a number' })
    .int()
    .nonnegative()
    .nullable()
    .optional(),
  is_exempt: z.boolean().optional(),
  exempt_reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

type FormData = z.infer<typeof schema>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isExpired(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

// ---------------------------------------------------------------------------
// PolicyCard component
// ---------------------------------------------------------------------------

function PolicyCard({
  policy,
  docs,
  onEdit,
  onDelete,
  onUploaded,
  onDocDeleted,
}: {
  policy: SubcontractorInsurancePolicy
  docs: Document[]
  onEdit: (p: SubcontractorInsurancePolicy) => void
  onDelete: (p: SubcontractorInsurancePolicy) => void
  onUploaded: (doc: Document) => void
  onDocDeleted: (id: number) => void
}) {
  const [uploadOpen, setUploadOpen] = useState(false)
  const expired = isExpired(policy.expiration_date)

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 font-medium">
            {POLICY_TYPE_LABELS[policy.policy_type]}
          </Badge>
          {policy.is_exempt === 1 && (
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Exempt</Badge>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(policy)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(policy)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Carrier</p>
          <p className="font-medium">{policy.carrier}</p>
        </div>
        {policy.policy_number && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Policy #</p>
            <p className="font-mono text-xs">{policy.policy_number}</p>
          </div>
        )}
        {policy.coverage_amount != null && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Coverage</p>
            <p className="font-medium">{formatCurrency(policy.coverage_amount)}</p>
          </div>
        )}
        {policy.effective_date && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Effective</p>
            <p>{formatDate(policy.effective_date)}</p>
          </div>
        )}
        {policy.expiration_date && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Expires</p>
            <p className={`flex items-center gap-1 ${expired ? 'font-semibold text-red-600' : ''}`}>
              {expired && <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />}
              {formatDate(policy.expiration_date)}
            </p>
          </div>
        )}
        {policy.policy_type === 'workers_comp' && policy.num_employees_covered != null && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Employees Covered</p>
            <p>{policy.num_employees_covered}</p>
          </div>
        )}
      </div>

      {/* Exempt reason */}
      {policy.is_exempt === 1 && policy.exempt_reason && (
        <p className="text-xs text-muted-foreground italic">Exemption: {policy.exempt_reason}</p>
      )}

      {/* Notes */}
      {policy.notes && (
        <p className="text-xs text-muted-foreground border-t pt-2">{policy.notes}</p>
      )}

      {/* Document upload toggle */}
      <div className="border-t pt-3">
        <button
          type="button"
          onClick={() => setUploadOpen(v => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {uploadOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {uploadOpen ? 'Hide' : 'Add COI or Policy Document'}
          {docs.length > 0 && (
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
              {docs.length}
            </span>
          )}
        </button>

        {uploadOpen && (
          <div className="mt-3 space-y-3">
            <FileList documents={docs} onDeleted={onDocDeleted} />
            <FileUpload
              entityType="subcontractor_insurance"
              entityId={policy.id}
              complianceCriterion={13}
              onUploaded={onUploaded}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  sub: Subcontractor
}

export function InsuranceSection({ sub }: Props) {
  const [policies, setPolicies] = useState<SubcontractorInsurancePolicy[]>([])
  const [docsByPolicy, setDocsByPolicy] = useState<Record<number, Document[]>>({})
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<SubcontractorInsurancePolicy | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      policy_type: 'general_liability',
      carrier: '',
      policy_number: '',
      coverage_amount: null,
      effective_date: '',
      expiration_date: '',
      num_employees_covered: null,
      is_exempt: false,
      exempt_reason: '',
      notes: '',
    },
  })

  const watchPolicyType = form.watch('policy_type')
  const watchIsExempt = form.watch('is_exempt')

  const loadPolicies = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<SubcontractorInsurancePolicy[]>(
        `/subcontractors/${sub.id}/insurance`,
      )
      setPolicies(data)
    } catch {
      toast({ title: 'Failed to load insurance policies', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [sub.id])

  useEffect(() => {
    loadPolicies()
  }, [loadPolicies])

  function openAdd() {
    setEditingPolicy(null)
    form.reset({
      policy_type: 'general_liability',
      carrier: '',
      policy_number: '',
      coverage_amount: null,
      effective_date: '',
      expiration_date: '',
      num_employees_covered: null,
      is_exempt: false,
      exempt_reason: '',
      notes: '',
    })
    setDialogOpen(true)
  }

  function openEdit(policy: SubcontractorInsurancePolicy) {
    setEditingPolicy(policy)
    form.reset({
      policy_type: policy.policy_type,
      carrier: policy.carrier,
      policy_number: policy.policy_number ?? '',
      coverage_amount: policy.coverage_amount ?? null,
      effective_date: policy.effective_date ?? '',
      expiration_date: policy.expiration_date ?? '',
      num_employees_covered: policy.num_employees_covered ?? null,
      is_exempt: policy.is_exempt === 1,
      exempt_reason: policy.exempt_reason ?? '',
      notes: policy.notes ?? '',
    })
    setDialogOpen(true)
  }

  async function onSubmit(data: FormData) {
    setSaving(true)
    const payload = {
      ...data,
      is_exempt: data.is_exempt ? 1 : 0,
      policy_number: data.policy_number || null,
      coverage_amount: data.coverage_amount ?? null,
      effective_date: data.effective_date || null,
      expiration_date: data.expiration_date || null,
      num_employees_covered: data.num_employees_covered ?? null,
      exempt_reason: data.exempt_reason || null,
      notes: data.notes || null,
    }
    try {
      if (editingPolicy) {
        const updated = await api.put<SubcontractorInsurancePolicy>(
          `/subcontractors/${sub.id}/insurance/${editingPolicy.id}`,
          payload,
        )
        setPolicies(prev => prev.map(p => (p.id === updated.id ? updated : p)))
        toast({ title: 'Policy updated' })
      } else {
        const created = await api.post<SubcontractorInsurancePolicy>(
          `/subcontractors/${sub.id}/insurance`,
          payload,
        )
        setPolicies(prev => [...prev, created])
        toast({ title: 'Policy added' })
      }
      setDialogOpen(false)
    } catch {
      toast({ title: 'Save failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(policy: SubcontractorInsurancePolicy) {
    if (
      !window.confirm(
        `Delete ${POLICY_TYPE_LABELS[policy.policy_type]} policy from ${policy.carrier}?`,
      )
    )
      return
    setDeleting(policy.id)
    try {
      await api.delete(`/subcontractors/${sub.id}/insurance/${policy.id}`)
      setPolicies(prev => prev.filter(p => p.id !== policy.id))
      setDocsByPolicy(prev => {
        const next = { ...prev }
        delete next[policy.id]
        return next
      })
      toast({ title: 'Policy deleted' })
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    } finally {
      setDeleting(null)
    }
  }

  function handleDocUploaded(policyId: number, doc: Document) {
    setDocsByPolicy(prev => ({
      ...prev,
      [policyId]: [...(prev[policyId] ?? []), doc],
    }))
  }

  function handleDocDeleted(policyId: number, docId: number) {
    setDocsByPolicy(prev => ({
      ...prev,
      [policyId]: (prev[policyId] ?? []).filter(d => d.id !== docId),
    }))
  }

  // Group policies by type, in canonical order
  const grouped = POLICY_TYPE_ORDER.reduce<
    { type: SubcontractorInsurancePolicy['policy_type']; items: SubcontractorInsurancePolicy[] }[]
  >((acc, type) => {
    const items = policies.filter(p => p.policy_type === type)
    if (items.length > 0) acc.push({ type, items })
    return acc
  }, [])

  return (
    <div className="space-y-4">
      {/* Legacy insurance info */}
      <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>
          Note: Insurance data from the legacy system is shown below if present. Add new policies
          using the form above.
        </span>
      </div>

      {(sub.insurance_carrier || sub.insurance_expiry) && (
        <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <p className="mb-1 font-medium text-gray-600">Legacy Insurance Record</p>
          {sub.insurance_carrier && (
            <p>
              <span className="font-medium">Carrier:</span> {sub.insurance_carrier}
            </p>
          )}
          {sub.insurance_policy && (
            <p>
              <span className="font-medium">Policy #:</span> {sub.insurance_policy}
            </p>
          )}
          {sub.insurance_expiry && (
            <p className="flex items-center gap-1">
              <span className="font-medium">Expiry:</span>
              <span className={isExpired(sub.insurance_expiry) ? 'font-semibold text-red-600' : ''}>
                {formatDate(sub.insurance_expiry)}
              </span>
              {isExpired(sub.insurance_expiry) && (
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              )}
            </p>
          )}
        </div>
      )}

      {/* Policies card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Insurance Policies
            {policies.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {policies.length}
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" onClick={openAdd} disabled={deleting !== null}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Policy
          </Button>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : policies.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No insurance policies on file.</p>
              <p className="text-xs mt-1">Add policies to track coverage and expiration dates.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(({ type, items }) => (
                <div key={type}>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {POLICY_TYPE_LABELS[type]}
                  </h4>
                  <div className="space-y-3">
                    {items.map(policy => (
                      <PolicyCard
                        key={policy.id}
                        policy={policy}
                        docs={docsByPolicy[policy.id] ?? []}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        onUploaded={doc => handleDocUploaded(policy.id, doc)}
                        onDocDeleted={id => handleDocDeleted(policy.id, id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPolicy ? 'Edit Insurance Policy' : 'Add Insurance Policy'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
            {/* Policy Type */}
            <div className="space-y-1.5">
              <Label>Policy Type *</Label>
              <Controller
                control={form.control}
                name="policy_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.entries(POLICY_TYPE_LABELS) as [
                          SubcontractorInsurancePolicy['policy_type'],
                          string,
                        ][]
                      ).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.policy_type && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.policy_type.message}
                </p>
              )}
            </div>

            {/* Carrier */}
            <div className="space-y-1.5">
              <Label>Carrier *</Label>
              <Input {...form.register('carrier')} placeholder="Insurance carrier name" />
              {form.formState.errors.carrier && (
                <p className="text-xs text-destructive">{form.formState.errors.carrier.message}</p>
              )}
            </div>

            {/* Policy Number */}
            <div className="space-y-1.5">
              <Label>Policy Number</Label>
              <Input {...form.register('policy_number')} placeholder="GL-000000" />
            </div>

            {/* Coverage Amount */}
            <div className="space-y-1.5">
              <Label>Coverage Amount ($)</Label>
              <Input
                type="number"
                min={0}
                step={1000}
                placeholder="1000000"
                {...form.register('coverage_amount', {
                  setValueAs: (v: string) => (v === '' ? null : Number(v)),
                })}
              />
              {form.formState.errors.coverage_amount && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.coverage_amount.message}
                </p>
              )}
            </div>

            {/* Effective / Expiration dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Effective Date</Label>
                <Input type="date" {...form.register('effective_date')} />
              </div>
              <div className="space-y-1.5">
                <Label>Expiration Date</Label>
                <Input type="date" {...form.register('expiration_date')} />
              </div>
            </div>

            {/* Workers Comp conditional fields */}
            {watchPolicyType === 'workers_comp' && (
              <div className="rounded-md border bg-muted/30 p-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Workers' Compensation Details
                </p>

                {/* Employees covered */}
                <div className="space-y-1.5">
                  <Label>Number of Employees Covered</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    {...form.register('num_employees_covered', {
                      setValueAs: (v: string) => (v === '' ? null : parseInt(v, 10)),
                    })}
                  />
                  {form.formState.errors.num_employees_covered && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.num_employees_covered.message}
                    </p>
                  )}
                </div>

                {/* Sole proprietor exemption */}
                <div className="flex items-center gap-2">
                  <input
                    id="is_exempt"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={watchIsExempt ?? false}
                    onChange={e => form.setValue('is_exempt', e.target.checked)}
                  />
                  <Label htmlFor="is_exempt" className="cursor-pointer font-normal">
                    Sole Proprietor Exemption (no WC required)
                  </Label>
                </div>

                {/* Exempt reason */}
                {watchIsExempt && (
                  <div className="space-y-1.5">
                    <Label>Exemption Reason</Label>
                    <Input
                      {...form.register('exempt_reason')}
                      placeholder="e.g. Sole proprietor with no employees"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea {...form.register('notes')} rows={3} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingPolicy ? 'Save Changes' : 'Add Policy'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
