import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, X, Check, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { FileUpload, FileList } from '@/components/shared/FileUpload'
import { api } from '@/lib/api'
import { toast } from '@/hooks/useToast'
import type { Subcontractor, Document } from '@/types'

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const schema = z.object({
  federal_ein: z
    .string()
    .regex(/^(\d{2}-\d{7})?$/, 'Format: XX-XXXXXXX')
    .nullable()
    .optional()
    .or(z.literal('')),
  w9_on_file: z.boolean(),
  mn_tax_id: z.string().nullable().optional(),
  mn_withholding_account: z.string().nullable().optional(),
  irs_1099_eligible: z.boolean(),
})

type FormData = z.infer<typeof schema>

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
// Helper components
// ---------------------------------------------------------------------------

function ReadRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b last:border-b-0">
      <dt className="text-sm text-muted-foreground font-medium">{label}</dt>
      <dd className="col-span-2 text-sm text-foreground">
        {value ?? <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  )
}

function YesNoBadge({ value }: { value: number | boolean }) {
  const yes = value === 1 || value === true
  return (
    <Badge variant={yes ? 'default' : 'secondary'} className="text-xs">
      {yes ? 'Yes' : 'No'}
    </Badge>
  )
}

function DocSection({
  title,
  description,
  entityId,
  complianceCriterion,
  docs,
  onUploaded,
  onDeleted,
}: {
  title: string
  description?: string
  entityId: number
  complianceCriterion: number
  docs: Document[]
  onUploaded: (doc: Document) => void
  onDeleted: (id: number) => void
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <FileUpload
        entityType="subcontractor"
        entityId={entityId}
        complianceCriterion={complianceCriterion}
        onUploaded={onUploaded}
      />
      {docs.length > 0 && (
        <FileList documents={docs} onDeleted={onDeleted} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TaxComplianceSection({ sub, onUpdated, documents, onDocumentsChange }: Props) {
  const [editing, setEditing] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      federal_ein: sub.federal_ein ?? '',
      w9_on_file: sub.w9_on_file === 1,
      mn_tax_id: sub.mn_tax_id ?? '',
      mn_withholding_account: sub.mn_withholding_account ?? '',
      irs_1099_eligible: sub.irs_1099_eligible === 1,
    },
  })

  const watchedW9 = watch('w9_on_file')
  const watched1099 = watch('irs_1099_eligible')

  function openEdit() {
    reset({
      federal_ein: sub.federal_ein ?? '',
      w9_on_file: sub.w9_on_file === 1,
      mn_tax_id: sub.mn_tax_id ?? '',
      mn_withholding_account: sub.mn_withholding_account ?? '',
      irs_1099_eligible: sub.irs_1099_eligible === 1,
    })
    setEditing(true)
  }

  async function onSubmit(data: FormData) {
    const payload = {
      federal_ein: data.federal_ein || null,
      w9_on_file: data.w9_on_file ? 1 : 0,
      mn_tax_id: data.mn_tax_id || null,
      mn_withholding_account: data.mn_withholding_account || null,
      irs_1099_eligible: data.irs_1099_eligible ? 1 : 0,
    }
    try {
      const updated = await api.put<Subcontractor>(`/subcontractors/${sub.id}`, payload)
      onUpdated(updated)
      setEditing(false)
      toast({ title: 'Tax compliance info updated' })
    } catch {
      toast({ title: 'Save failed', description: 'Could not update tax compliance info.', variant: 'destructive' })
    }
  }

  // Document buckets by compliance criterion
  const w9Docs = documents.filter((d) => d.compliance_criterion === 6)
  const einDocs = documents.filter((d) => d.compliance_criterion === 4)
  const mnTaxDocs = documents.filter((d) => d.compliance_criterion === 5)

  function handleUploaded(doc: Document) {
    onDocumentsChange([...documents, doc])
  }

  function handleDeleted(id: number) {
    onDocumentsChange(documents.filter((d) => d.id !== id))
  }

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------------ */}
      {/* Tax Fields Card */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Tax Compliance
          </CardTitle>
          {!editing && (
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {!editing ? (
            /* --- Read Mode --- */
            <dl className="divide-y">
              <ReadRow
                label="Federal EIN"
                value={
                  sub.federal_ein ? (
                    <span className="font-mono tracking-wide">{sub.federal_ein}</span>
                  ) : null
                }
              />
              <ReadRow label="W-9 on File" value={<YesNoBadge value={sub.w9_on_file} />} />
              <ReadRow label="MN Tax ID Number" value={sub.mn_tax_id} />
              <ReadRow label="MN Withholding Account" value={sub.mn_withholding_account} />
              <ReadRow label="IRS 1099 Eligible" value={<YesNoBadge value={sub.irs_1099_eligible} />} />
            </dl>
          ) : (
            /* --- Edit Mode --- */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Federal EIN */}
              <div className="space-y-1">
                <Label>Federal EIN</Label>
                <Input
                  {...register('federal_ein')}
                  placeholder="12-3456789"
                  className="font-mono max-w-[14rem]"
                />
                <p className="text-xs text-muted-foreground">Format: XX-XXXXXXX</p>
                {errors.federal_ein && (
                  <p className="text-xs text-destructive">{errors.federal_ein.message}</p>
                )}
              </div>

              {/* W-9 on File */}
              <div className="flex items-start gap-3 rounded-md border p-3">
                <input
                  type="checkbox"
                  id="w9_on_file"
                  checked={watchedW9}
                  onChange={(e) => setValue('w9_on_file', e.target.checked)}
                  className="h-4 w-4 mt-0.5 rounded border-border accent-primary"
                />
                <div>
                  <Label htmlFor="w9_on_file" className="cursor-pointer font-medium">
                    W-9 on File
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    We have a current signed W-9 form from this subcontractor.
                  </p>
                </div>
              </div>

              {/* MN Tax ID */}
              <div className="space-y-1">
                <Label>MN Tax ID Number</Label>
                <Input {...register('mn_tax_id')} placeholder="e.g. 1234567" className="max-w-[14rem]" />
              </div>

              {/* MN Withholding Account */}
              <div className="space-y-1">
                <Label>MN Withholding Account</Label>
                <Input
                  {...register('mn_withholding_account')}
                  placeholder="e.g. 1234567-WH"
                  className="max-w-[14rem]"
                />
              </div>

              {/* IRS 1099 Eligible */}
              <div className="flex items-start gap-3 rounded-md border p-3">
                <input
                  type="checkbox"
                  id="irs_1099_eligible"
                  checked={watched1099}
                  onChange={(e) => setValue('irs_1099_eligible', e.target.checked)}
                  className="h-4 w-4 mt-0.5 rounded border-border accent-primary"
                />
                <div>
                  <Label htmlFor="irs_1099_eligible" className="cursor-pointer font-medium">
                    IRS 1099 Eligible
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    This subcontractor should receive a 1099-NEC if paid $600+.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(false)}
                  disabled={isSubmitting}
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  {isSubmitting ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Document Upload Cards */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tax Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DocSection
            title="W-9 Form"
            description="Signed Request for Taxpayer Identification Number and Certification."
            entityId={sub.id}
            complianceCriterion={6}
            docs={w9Docs}
            onUploaded={handleUploaded}
            onDeleted={handleDeleted}
          />

          <div className="border-t" />

          <DocSection
            title="IRS EIN Letter (CP575)"
            description="IRS Employer Identification Number assignment confirmation letter."
            entityId={sub.id}
            complianceCriterion={4}
            docs={einDocs}
            onUploaded={handleUploaded}
            onDeleted={handleDeleted}
          />

          <div className="border-t" />

          <DocSection
            title="MN Revenue Tax ID Confirmation"
            description="Minnesota Department of Revenue tax ID confirmation document."
            entityId={sub.id}
            complianceCriterion={5}
            docs={mnTaxDocs}
            onUploaded={handleUploaded}
            onDeleted={handleDeleted}
          />
        </CardContent>
      </Card>
    </div>
  )
}
