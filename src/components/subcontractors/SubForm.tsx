import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Subcontractor } from '@/types'
import { TRADE_LABELS } from '@/lib/utils'

const TRADES = Object.keys(TRADE_LABELS)
const STATUSES = ['active', 'inactive', 'do_not_use']

const schema = z.object({
  company_name: z.string().min(1),
  trade: z.string().min(1),
  status: z.string().default('active'),
  contact_name: z.string().nullable().optional(),
  contact_email: z.string().email().nullable().optional().or(z.literal('')),
  contact_phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  license_number: z.string().nullable().optional(),
  license_expiry: z.string().nullable().optional(),
  insurance_carrier: z.string().nullable().optional(),
  insurance_expiry: z.string().nullable().optional(),
  insurance_amount: z.number().nullable().optional(),
  w9_on_file: z.boolean().default(false),
  prequalified: z.boolean().default(false),
  rating: z.number().min(1).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
})

export type SubFormData = z.infer<typeof schema>

interface SubFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: SubFormData) => Promise<void>
  initialValues?: Partial<Subcontractor>
  title?: string
}

export function SubForm({ open, onOpenChange, onSave, initialValues, title = 'New Subcontractor' }: SubFormProps) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<SubFormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'active', w9_on_file: false, prequalified: false },
  })

  useEffect(() => {
    if (open) {
      reset({
        company_name: initialValues?.company_name ?? '',
        trade: initialValues?.trade ?? '',
        status: initialValues?.status ?? 'active',
        contact_name: initialValues?.contact_name ?? '',
        contact_email: initialValues?.contact_email ?? '',
        contact_phone: initialValues?.contact_phone ?? '',
        address: initialValues?.address ?? '',
        city: initialValues?.city ?? '',
        state: initialValues?.state ?? '',
        zip: initialValues?.zip ?? '',
        license_number: initialValues?.license_number ?? '',
        license_expiry: initialValues?.license_expiry?.slice(0, 10) ?? '',
        insurance_carrier: initialValues?.insurance_carrier ?? '',
        insurance_expiry: initialValues?.insurance_expiry?.slice(0, 10) ?? '',
        insurance_amount: initialValues?.insurance_amount ?? null,
        w9_on_file: Boolean(initialValues?.w9_on_file),
        prequalified: Boolean(initialValues?.prequalified),
        rating: initialValues?.rating ?? null,
        notes: initialValues?.notes ?? '',
      })
    }
  }, [open, initialValues, reset])

  const trade = watch('trade')
  const status = watch('status')
  const w9 = watch('w9_on_file')
  const prequal = watch('prequalified')

  const onSubmit = async (data: SubFormData) => {
    await onSave(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Company Name *</Label>
              <Input {...register('company_name')} placeholder="Acme Electrical Inc." />
              {errors.company_name && <p className="text-xs text-destructive mt-1">Required</p>}
            </div>
            <div>
              <Label>Trade *</Label>
              <Select value={trade} onValueChange={v => setValue('trade', v)}>
                <SelectTrigger><SelectValue placeholder="Select trade" /></SelectTrigger>
                <SelectContent>
                  {TRADES.map(t => <SelectItem key={t} value={t}>{TRADE_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.trade && <p className="text-xs text-destructive mt-1">Required</p>}
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={v => setValue('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Primary Contact</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Name</Label>
                <Input {...register('contact_name')} placeholder="Jane Smith" />
              </div>
              <div>
                <Label>Email</Label>
                <Input {...register('contact_email')} type="email" placeholder="jane@acme.com" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input {...register('contact_phone')} placeholder="(612) 555-1234" />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Address</p>
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

          <div className="border-t pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">License & Insurance</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>License #</Label>
                <Input {...register('license_number')} placeholder="MN-123456" />
              </div>
              <div>
                <Label>License Expiry</Label>
                <Input type="date" {...register('license_expiry')} />
              </div>
              <div>
                <Label>Insurance Carrier</Label>
                <Input {...register('insurance_carrier')} placeholder="Carrier name" />
              </div>
              <div>
                <Label>Insurance Expiry</Label>
                <Input type="date" {...register('insurance_expiry')} />
              </div>
              <div>
                <Label>Coverage Amount ($)</Label>
                <Input
                  type="number"
                  step="1000"
                  placeholder="1000000"
                  onChange={e => setValue('insurance_amount', e.target.value ? parseFloat(e.target.value) : null)}
                  defaultValue={initialValues?.insurance_amount ?? ''}
                />
              </div>
              <div>
                <Label>Rating (1–5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  placeholder="e.g. 4"
                  onChange={e => setValue('rating', e.target.value ? parseInt(e.target.value) : null)}
                  defaultValue={initialValues?.rating ?? ''}
                />
              </div>
            </div>
            <div className="flex gap-6 mt-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={w9} onChange={e => setValue('w9_on_file', e.target.checked)} className="rounded" />
                W-9 on file
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={prequal} onChange={e => setValue('prequalified', e.target.checked)} className="rounded" />
                Prequalified
              </label>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea {...register('notes')} rows={3} placeholder="Internal notes about this subcontractor…" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
