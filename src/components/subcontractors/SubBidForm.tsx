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
import type { SubcontractorBid, Project } from '@/types'

const BID_STATUSES = ['invited', 'received', 'leveled', 'awarded', 'rejected']

const schema = z.object({
  project_id: z.number({ required_error: 'Required' }),
  trade_package: z.string().nullable().optional(),
  bid_amount: z.number().nullable().optional(),
  bid_status: z.string().default('invited'),
  awarded_amount: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export type SubBidFormData = z.infer<typeof schema>

interface SubBidFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: SubBidFormData) => Promise<void>
  projects: Project[]
  initialValues?: Partial<SubcontractorBid>
  title?: string
}

export function SubBidForm({ open, onOpenChange, onSave, projects, initialValues, title = 'New Bid' }: SubBidFormProps) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<SubBidFormData>({
    resolver: zodResolver(schema),
    defaultValues: { bid_status: 'invited' },
  })

  useEffect(() => {
    if (open) {
      reset({
        project_id: initialValues?.project_id ?? undefined,
        trade_package: initialValues?.trade_package ?? '',
        bid_amount: initialValues?.bid_amount ?? null,
        bid_status: initialValues?.bid_status ?? 'invited',
        awarded_amount: initialValues?.awarded_amount ?? null,
        notes: initialValues?.notes ?? '',
      })
    }
  }, [open, initialValues, reset])

  const bidStatus = watch('bid_status')
  const projectId = watch('project_id')

  const onSubmit = async (data: SubBidFormData) => {
    await onSave(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Project *</Label>
            <Select value={projectId ? String(projectId) : ''} onValueChange={v => setValue('project_id', Number(v))}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.project_number} — {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.project_id && <p className="text-xs text-destructive mt-1">Required</p>}
          </div>

          <div>
            <Label>Trade Package</Label>
            <Input {...register('trade_package')} placeholder="e.g. Electrical — Main Panel" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Bid Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                onChange={e => setValue('bid_amount', e.target.value ? parseFloat(e.target.value) : null)}
                defaultValue={initialValues?.bid_amount ?? ''}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={bidStatus} onValueChange={v => setValue('bid_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BID_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {bidStatus === 'awarded' && (
            <div>
              <Label>Awarded Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                onChange={e => setValue('awarded_amount', e.target.value ? parseFloat(e.target.value) : null)}
                defaultValue={initialValues?.awarded_amount ?? ''}
              />
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea {...register('notes')} rows={2} placeholder="Bid notes…" />
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
