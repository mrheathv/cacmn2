import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Pencil, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/utils'
import type { Subcontractor } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  check: 'Check',
  ach: 'ACH / Direct Deposit',
  wire: 'Wire Transfer',
  credit_card: 'Credit Card',
  other: 'Other',
}

type PaymentMethod = 'check' | 'ach' | 'wire' | 'credit_card' | 'other'

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const schema = z.object({
  vendor_id: z.string().nullable().optional(),
  payment_method: z
    .enum(['check', 'ach', 'wire', 'credit_card', 'other'])
    .nullable()
    .optional(),
  requires_1099: z.boolean(),
  date_1099_issued: z.string().nullable().optional(),
  accounting_system_ref: z.string().nullable().optional(),
})

type FormData = z.infer<typeof schema>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ReadRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b last:border-b-0">
      <dt className="text-sm text-muted-foreground font-medium">{label}</dt>
      <dd className="col-span-2 text-sm text-foreground">
        {value != null && value !== '' && value !== false ? (
          value
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  sub: Subcontractor
  onUpdated: (updated: Subcontractor) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PaymentSection({ sub, onUpdated }: Props) {
  const [editing, setEditing] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      vendor_id: sub.vendor_id ?? '',
      payment_method: sub.payment_method ?? null,
      requires_1099: sub.requires_1099 === 1,
      date_1099_issued: sub.date_1099_issued ?? '',
      accounting_system_ref: sub.accounting_system_ref ?? '',
    },
  })

  function openEdit() {
    reset({
      vendor_id: sub.vendor_id ?? '',
      payment_method: sub.payment_method ?? null,
      requires_1099: sub.requires_1099 === 1,
      date_1099_issued: sub.date_1099_issued ?? '',
      accounting_system_ref: sub.accounting_system_ref ?? '',
    })
    setEditing(true)
  }

  async function onSubmit(data: FormData) {
    try {
      const payload = {
        vendor_id: data.vendor_id || null,
        payment_method: data.payment_method ?? null,
        requires_1099: data.requires_1099 ? 1 : 0,
        date_1099_issued: data.date_1099_issued || null,
        accounting_system_ref: data.accounting_system_ref || null,
      }
      const updated = await api.put<Subcontractor>(`/subcontractors/${sub.id}`, payload)
      onUpdated(updated)
      setEditing(false)
      toast({ title: 'Payment info updated' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast({ title: 'Save failed', description: msg, variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Payment &amp; Reporting</CardTitle>
        {!editing && (
          <Button variant="outline" size="sm" onClick={openEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!editing ? (
          /* ---- Read Mode ---- */
          <dl className="divide-y">
            <ReadRow label="Vendor ID" value={sub.vendor_id} />
            <ReadRow
              label="Payment Method"
              value={
                sub.payment_method
                  ? PAYMENT_METHOD_LABELS[sub.payment_method] ?? sub.payment_method
                  : null
              }
            />
            <ReadRow
              label="1099 Required"
              value={
                <Badge
                  variant={sub.requires_1099 ? 'default' : 'secondary'}
                  className={
                    sub.requires_1099
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : undefined
                  }
                >
                  {sub.requires_1099 ? 'Yes' : 'No'}
                </Badge>
              }
            />
            <ReadRow
              label="1099 Issued Date"
              value={formatDate(sub.date_1099_issued) !== '—' ? formatDate(sub.date_1099_issued) : null}
            />
            <ReadRow label="Accounting System Ref" value={sub.accounting_system_ref} />
            <ReadRow
              label="IRS 1099 Eligible"
              value={
                <div className="flex items-center gap-2">
                  <Badge
                    variant={sub.irs_1099_eligible ? 'default' : 'secondary'}
                    className={
                      sub.irs_1099_eligible
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : undefined
                    }
                  >
                    {sub.irs_1099_eligible ? 'Yes' : 'No'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">(computed)</span>
                </div>
              }
            />
          </dl>
        ) : (
          /* ---- Edit Mode ---- */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {/* Vendor ID */}
              <div>
                <Label htmlFor="vendor_id">Vendor ID</Label>
                <Input
                  id="vendor_id"
                  placeholder="e.g. V-1042"
                  {...register('vendor_id')}
                />
                {errors.vendor_id && (
                  <p className="text-xs text-destructive mt-1">{errors.vendor_id.message}</p>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Controller
                  control={control}
                  name="payment_method"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? '__none__'}
                      onValueChange={(v) =>
                        field.onChange(v === '__none__' ? null : (v as PaymentMethod))
                      }
                    >
                      <SelectTrigger id="payment_method">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Not Set —</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="ach">ACH / Direct Deposit</SelectItem>
                        <SelectItem value="wire">Wire Transfer</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Accounting System Ref */}
              <div>
                <Label htmlFor="accounting_system_ref">Accounting System Ref</Label>
                <Input
                  id="accounting_system_ref"
                  placeholder="e.g. QB Vendor #1042"
                  {...register('accounting_system_ref')}
                />
              </div>

              {/* 1099 Issued Date */}
              <div>
                <Label htmlFor="date_1099_issued">1099 Issued Date</Label>
                <Input
                  id="date_1099_issued"
                  type="date"
                  {...register('date_1099_issued')}
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tax Reporting
              </p>

              {/* requires_1099 */}
              <div className="flex items-center gap-3">
                <Controller
                  control={control}
                  name="requires_1099"
                  render={({ field }) => (
                    <input
                      id="requires_1099"
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  )}
                />
                <Label htmlFor="requires_1099" className="cursor-pointer">
                  Requires 1099
                  <span className="ml-1 text-xs text-muted-foreground font-normal">
                    — this subcontractor must receive a 1099-NEC
                  </span>
                </Label>
              </div>

              {/* irs_1099_eligible — read-only */}
              <div className="flex items-center gap-3 opacity-70">
                <input
                  type="checkbox"
                  checked={sub.irs_1099_eligible === 1}
                  disabled
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                  aria-label="IRS 1099 Eligible (computed)"
                />
                <span className="text-sm">
                  IRS 1099 Eligible{' '}
                  <span className="text-xs text-muted-foreground">(computed — not editable here)</span>
                </span>
              </div>
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
  )
}
