import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, X, Check, Globe, Phone, Mail, MapPin, Building2, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { FileUpload, FileList } from '@/components/shared/FileUpload'
import { api } from '@/lib/api'
import { toast } from '@/hooks/useToast'
import { formatDate, TRADE_LABELS } from '@/lib/utils'
import type { Subcontractor, Document } from '@/types'

const TRADES = Object.keys(TRADE_LABELS)

const BUSINESS_STRUCTURES = [
  { value: 'sole_prop', label: 'Sole Proprietorship' },
  { value: 'llc', label: 'LLC' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'partnership', label: 'Partnership' },
] as const

const BUSINESS_STRUCTURE_LABELS: Record<string, string> = {
  sole_prop: 'Sole Proprietorship',
  llc: 'LLC',
  corporation: 'Corporation',
  partnership: 'Partnership',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  do_not_use: 'Do Not Use',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  inactive: 'secondary',
  do_not_use: 'destructive',
}

const schema = z.object({
  company_name: z.string().min(1, 'Required'),
  dba_name: z.string().nullable().optional(),
  business_structure: z
    .enum(['sole_prop', 'llc', 'corporation', 'partnership'])
    .nullable()
    .optional(),
  trade: z.string().min(1, 'Required'),
  additional_trades: z.string().nullable().optional(),
  state_of_registration: z.string().nullable().optional(),
  mn_sos_number: z.string().nullable().optional(),
  business_start_date: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  mailing_address: z.string().nullable().optional(),
  mailing_city: z.string().nullable().optional(),
  mailing_state: z.string().nullable().optional(),
  mailing_zip: z.string().nullable().optional(),
  business_phone: z.string().nullable().optional(),
  business_email: z
    .string()
    .email('Invalid email')
    .nullable()
    .optional()
    .or(z.literal('')),
  website: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive', 'do_not_use']),
  notes: z.string().nullable().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  sub: Subcontractor
  onUpdated: (updated: Subcontractor) => void
  documents: Document[]
  onDocumentsChange: (docs: Document[]) => void
}

function ReadRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b last:border-b-0">
      <dt className="text-sm text-muted-foreground font-medium">{label}</dt>
      <dd className="col-span-2 text-sm text-foreground">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  )
}

function addressLine(
  street?: string | null,
  city?: string | null,
  state?: string | null,
  zip?: string | null,
): string {
  const parts = [street, city && state ? `${city}, ${state}` : city ?? state, zip].filter(Boolean)
  return parts.join(' · ')
}

function mailingDifferent(sub: Subcontractor): boolean {
  return (
    (sub.mailing_address ?? '') !== (sub.address ?? '') ||
    (sub.mailing_city ?? '') !== (sub.city ?? '') ||
    (sub.mailing_state ?? '') !== (sub.state ?? '') ||
    (sub.mailing_zip ?? '') !== (sub.zip ?? '')
  )
}

export function BusinessProfileSection({ sub, onUpdated, documents, onDocumentsChange }: Props) {
  const [editing, setEditing] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      company_name: sub.company_name,
      dba_name: sub.dba_name ?? '',
      business_structure: sub.business_structure ?? null,
      trade: sub.trade,
      additional_trades: sub.additional_trades ?? '',
      state_of_registration: sub.state_of_registration ?? '',
      mn_sos_number: sub.mn_sos_number ?? '',
      business_start_date: sub.business_start_date ?? '',
      address: sub.address ?? '',
      city: sub.city ?? '',
      state: sub.state ?? '',
      zip: sub.zip ?? '',
      mailing_address: sub.mailing_address ?? '',
      mailing_city: sub.mailing_city ?? '',
      mailing_state: sub.mailing_state ?? '',
      mailing_zip: sub.mailing_zip ?? '',
      business_phone: sub.business_phone ?? '',
      business_email: sub.business_email ?? '',
      website: sub.website ?? '',
      status: sub.status,
      notes: sub.notes ?? '',
    },
  })

  const trade = watch('trade')
  const structure = watch('business_structure')
  const status = watch('status')

  function openEdit() {
    reset({
      company_name: sub.company_name,
      dba_name: sub.dba_name ?? '',
      business_structure: sub.business_structure ?? null,
      trade: sub.trade,
      additional_trades: sub.additional_trades ?? '',
      state_of_registration: sub.state_of_registration ?? '',
      mn_sos_number: sub.mn_sos_number ?? '',
      business_start_date: sub.business_start_date ?? '',
      address: sub.address ?? '',
      city: sub.city ?? '',
      state: sub.state ?? '',
      zip: sub.zip ?? '',
      mailing_address: sub.mailing_address ?? '',
      mailing_city: sub.mailing_city ?? '',
      mailing_state: sub.mailing_state ?? '',
      mailing_zip: sub.mailing_zip ?? '',
      business_phone: sub.business_phone ?? '',
      business_email: sub.business_email ?? '',
      website: sub.website ?? '',
      status: sub.status,
      notes: sub.notes ?? '',
    })
    setEditing(true)
  }

  async function onSubmit(data: FormData) {
    try {
      const updated = await api.put<Subcontractor>(`/subcontractors/${sub.id}`, data)
      onUpdated(updated)
      setEditing(false)
      toast({ title: 'Business profile updated' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast({ title: 'Save failed', description: msg, variant: 'destructive' })
    }
  }

  const generalDocs = documents.filter((d) => d.compliance_criterion == null)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Business Profile</CardTitle>
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
              <ReadRow label="Legal Business Name" value={sub.company_name} />
              <ReadRow label="DBA / Trade Name" value={sub.dba_name} />
              <ReadRow
                label="Business Structure"
                value={sub.business_structure ? BUSINESS_STRUCTURE_LABELS[sub.business_structure] : null}
              />
              <ReadRow
                label="Primary Trade"
                value={TRADE_LABELS[sub.trade] ?? sub.trade}
              />
              <ReadRow label="Additional Trades" value={sub.additional_trades} />
              <ReadRow label="State of Registration" value={sub.state_of_registration} />
              <ReadRow label="MN SOS Registration #" value={sub.mn_sos_number} />
              <ReadRow
                label="Business Start Date"
                value={
                  sub.business_start_date ? (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(sub.business_start_date)}
                    </span>
                  ) : null
                }
              />
              <ReadRow
                label="Business Address"
                value={
                  addressLine(sub.address, sub.city, sub.state, sub.zip) ? (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      {addressLine(sub.address, sub.city, sub.state, sub.zip)}
                    </span>
                  ) : null
                }
              />
              {mailingDifferent(sub) && (
                <ReadRow
                  label="Mailing Address"
                  value={
                    addressLine(sub.mailing_address, sub.mailing_city, sub.mailing_state, sub.mailing_zip) ? (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        {addressLine(sub.mailing_address, sub.mailing_city, sub.mailing_state, sub.mailing_zip)}
                      </span>
                    ) : null
                  }
                />
              )}
              <ReadRow
                label="Business Phone"
                value={
                  sub.business_phone ? (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {sub.business_phone}
                    </span>
                  ) : null
                }
              />
              <ReadRow
                label="Business Email"
                value={
                  sub.business_email ? (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {sub.business_email}
                    </span>
                  ) : null
                }
              />
              <ReadRow
                label="Website"
                value={
                  sub.website ? (
                    <a
                      href={sub.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {sub.website}
                    </a>
                  ) : null
                }
              />
              <ReadRow
                label="Status"
                value={
                  <Badge variant={STATUS_VARIANTS[sub.status] ?? 'secondary'}>
                    {STATUS_LABELS[sub.status] ?? sub.status}
                  </Badge>
                }
              />
              <ReadRow label="Notes" value={sub.notes} />
            </dl>
          ) : (
            /* --- Edit Mode --- */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Identity */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Business Identity
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Legal Business Name *</Label>
                    <Input {...register('company_name')} placeholder="Acme Electrical Inc." />
                    {errors.company_name && (
                      <p className="text-xs text-destructive mt-1">{errors.company_name.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>DBA / Trade Name</Label>
                    <Input {...register('dba_name')} placeholder="Acme Electric" />
                  </div>
                  <div>
                    <Label>Business Structure</Label>
                    <Select
                      value={structure ?? ''}
                      onValueChange={(v) =>
                        setValue(
                          'business_structure',
                          (v || null) as FormData['business_structure'],
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUSINESS_STRUCTURES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Primary Trade *</Label>
                    <Select value={trade} onValueChange={(v) => setValue('trade', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select trade" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRADES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {TRADE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.trade && (
                      <p className="text-xs text-destructive mt-1">{errors.trade.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>Additional Trades</Label>
                    <Input {...register('additional_trades')} placeholder="e.g. Framing, Drywall" />
                  </div>
                  <div>
                    <Label>State of Registration</Label>
                    <Input {...register('state_of_registration')} placeholder="MN" maxLength={2} />
                  </div>
                  <div>
                    <Label>MN SOS Registration #</Label>
                    <Input {...register('mn_sos_number')} placeholder="MN12345678" />
                  </div>
                  <div>
                    <Label>Business Start Date</Label>
                    <Input {...register('business_start_date')} type="date" />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={status} onValueChange={(v) => setValue('status', v as FormData['status'])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="do_not_use">Do Not Use</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Business Address */}
              <div className="border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Business Address
                </p>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-4">
                    <Label>Street</Label>
                    <Input {...register('address')} placeholder="123 Main St" />
                  </div>
                  <div className="col-span-2">
                    <Label>City</Label>
                    <Input {...register('city')} placeholder="Minneapolis" />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input {...register('state')} placeholder="MN" maxLength={2} />
                  </div>
                  <div>
                    <Label>ZIP</Label>
                    <Input {...register('zip')} placeholder="55401" />
                  </div>
                </div>
              </div>

              {/* Mailing Address */}
              <div className="border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Mailing Address <span className="normal-case font-normal">(leave blank if same as above)</span>
                </p>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-4">
                    <Label>Street</Label>
                    <Input {...register('mailing_address')} placeholder="PO Box 100" />
                  </div>
                  <div className="col-span-2">
                    <Label>City</Label>
                    <Input {...register('mailing_city')} placeholder="Minneapolis" />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input {...register('mailing_state')} placeholder="MN" maxLength={2} />
                  </div>
                  <div>
                    <Label>ZIP</Label>
                    <Input {...register('mailing_zip')} placeholder="55401" />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="border-t pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Contact Info
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Business Phone</Label>
                    <Input {...register('business_phone')} placeholder="(612) 555-1234" />
                  </div>
                  <div>
                    <Label>Business Email</Label>
                    <Input {...register('business_email')} type="email" placeholder="info@acme.com" />
                    {errors.business_email && (
                      <p className="text-xs text-destructive mt-1">{errors.business_email.message}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <Label>Website</Label>
                    <Input {...register('website')} placeholder="https://acme.com" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="border-t pt-4">
                <Label>Notes</Label>
                <Textarea {...register('notes')} rows={3} placeholder="Internal notes…" />
              </div>

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

      {/* Supporting Documents */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Supporting Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FileUpload
            entityType="subcontractor"
            entityId={sub.id}
            onUploaded={(doc) => onDocumentsChange([...documents, doc])}
          />
          {generalDocs.length > 0 && (
            <FileList
              documents={generalDocs}
              onDeleted={(id) => onDocumentsChange(documents.filter((d) => d.id !== id))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
