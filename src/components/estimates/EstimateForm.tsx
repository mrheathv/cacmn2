import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Client, Project } from '@/types'

const schema = z.object({
  client_id: z.number({ required_error: 'Client required' }),
  project_id: z.number().optional(),
  title: z.string().min(1, 'Required'),
  description: z.string().optional(),
  valid_until: z.string().optional(),
  markup_pct: z.number().min(0).max(100).optional(),
  tax_pct: z.number().min(0).max(100).optional(),
  terms: z.string().optional(),
  client_notes: z.string().optional(),
})

export type EstimateFormData = z.infer<typeof schema>

interface EstimateFormProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSave: (data: EstimateFormData) => Promise<void>
  clients: Client[]
  projects: Project[]
  initialValues?: Partial<EstimateFormData>
  title?: string
}

export function EstimateForm({ open, onOpenChange, onSave, clients, projects, initialValues, title = 'New Estimate' }: EstimateFormProps) {
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<EstimateFormData>({
    resolver: zodResolver(schema),
    defaultValues: { markup_pct: 0, tax_pct: 0, terms: 'Net 30' },
  })

  useEffect(() => {
    if (open) reset(initialValues ?? { markup_pct: 0, tax_pct: 0, terms: 'Net 30' })
  }, [open, initialValues, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Client *</Label>
            <Select defaultValue={initialValues?.client_id?.toString()} onValueChange={v => setValue('client_id', Number(v))}>
              <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
              <SelectContent>{clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.company_name}</SelectItem>)}</SelectContent>
            </Select>
            {errors.client_id && <p className="text-xs text-destructive">{errors.client_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Link to Project (optional)</Label>
            <Select defaultValue={initialValues?.project_id?.toString() ?? ''} onValueChange={v => setValue('project_id', v ? Number(v) : undefined)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.project_number} — {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input {...register('title')} placeholder="e.g. 3rd Floor Office TI Proposal" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea {...register('description')} rows={2} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Markup %</Label>
              <Input type="number" step="0.1" min="0" max="100" {...register('markup_pct', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Tax %</Label>
              <Input type="number" step="0.1" min="0" max="100" {...register('tax_pct', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Valid Until</Label>
              <Input type="date" {...register('valid_until')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Payment Terms</Label>
            <Input {...register('terms')} placeholder="Net 30" />
          </div>

          <div className="space-y-1.5">
            <Label>Client-Visible Notes</Label>
            <Textarea {...register('client_notes')} rows={2} placeholder="Notes that will appear on the proposal..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Create Estimate'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
