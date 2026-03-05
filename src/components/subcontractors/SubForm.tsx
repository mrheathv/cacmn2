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
  dba_name: z.string().nullable().optional(),
  business_structure: z.enum(['sole_prop','llc','corporation','partnership']).nullable().optional(),
  trade: z.string().min(1),
  status: z.string().default('active'),
  business_phone: z.string().nullable().optional(),
  business_email: z.string().email().nullable().optional().or(z.literal('')),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
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

const BUSINESS_STRUCTURES = [
  { value: 'llc', label: 'LLC' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'sole_prop', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
]

export function SubForm({ open, onOpenChange, onSave, initialValues, title = 'New Subcontractor' }: SubFormProps) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<SubFormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'active' },
  })

  useEffect(() => {
    if (open) {
      reset({
        company_name: initialValues?.company_name ?? '',
        dba_name: initialValues?.dba_name ?? '',
        business_structure: initialValues?.business_structure ?? null,
        trade: initialValues?.trade ?? '',
        status: initialValues?.status ?? 'active',
        business_phone: initialValues?.business_phone ?? initialValues?.contact_phone ?? '',
        business_email: initialValues?.business_email ?? initialValues?.contact_email ?? '',
        address: initialValues?.address ?? '',
        city: initialValues?.city ?? '',
        state: initialValues?.state ?? 'MN',
        zip: initialValues?.zip ?? '',
        notes: initialValues?.notes ?? '',
      })
    }
  }, [open, initialValues, reset])

  const trade = watch('trade')
  const status = watch('status')
  const structure = watch('business_structure')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          {/* Business identity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Legal Business Name *</Label>
              <Input {...register('company_name')} placeholder="Acme Electrical Inc." />
              {errors.company_name && <p className="text-xs text-destructive mt-1">Required</p>}
            </div>
            <div>
              <Label>DBA / Trade Name</Label>
              <Input {...register('dba_name')} placeholder="Acme Electric" />
            </div>
            <div>
              <Label>Business Structure</Label>
              <Select value={structure ?? ''} onValueChange={v => setValue('business_structure', v as SubFormData['business_structure'] ?? null)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {BUSINESS_STRUCTURES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
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

          {/* Contact */}
          <div className="border-t pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Business Contact</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Business Phone</Label>
                <Input {...register('business_phone')} placeholder="(612) 555-1234" />
              </div>
              <div>
                <Label>Business Email</Label>
                <Input {...register('business_email')} type="email" placeholder="info@acme.com" />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="border-t pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Business Address</p>
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

          <div>
            <Label>Notes</Label>
            <Textarea {...register('notes')} rows={2} placeholder="Internal notes…" />
          </div>

          <p className="text-xs text-muted-foreground">
            Additional details (owners, licenses, insurance, tax info) can be filled in after creating the record.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
