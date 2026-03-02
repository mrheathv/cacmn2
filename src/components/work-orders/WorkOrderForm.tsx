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
import type { WorkOrder, Client, Project, User } from '@/types'

const WO_STATUSES = ['draft', 'issued', 'in_progress', 'pending_approval', 'complete', 'cancelled']
const WO_PRIORITIES = ['low', 'normal', 'high', 'urgent']
const WO_TYPES = ['repair', 'maintenance', 'inspection', 'new_work', 'warranty', 'other']

const schema = z.object({
  title: z.string().min(1),
  client_id: z.number().nullable().optional(),
  project_id: z.number().nullable().optional(),
  assigned_to: z.number().nullable().optional(),
  status: z.string().default('draft'),
  priority: z.string().default('normal'),
  wo_type: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  scope_of_work: z.string().nullable().optional(),
  scheduled_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  estimated_cost: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export type WorkOrderFormData = z.infer<typeof schema>

interface WorkOrderFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: WorkOrderFormData) => Promise<void>
  clients: Client[]
  projects: Project[]
  users: User[]
  initialValues?: Partial<WorkOrder>
  title?: string
}

export function WorkOrderForm({ open, onOpenChange, onSave, clients, projects, users, initialValues, title = 'New Work Order' }: WorkOrderFormProps) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<WorkOrderFormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'draft', priority: 'normal' },
  })

  useEffect(() => {
    if (open) {
      reset({
        title: initialValues?.title ?? '',
        client_id: initialValues?.client_id ?? null,
        project_id: initialValues?.project_id ?? null,
        assigned_to: initialValues?.assigned_to ?? null,
        status: initialValues?.status ?? 'draft',
        priority: initialValues?.priority ?? 'normal',
        wo_type: initialValues?.wo_type ?? null,
        description: initialValues?.description ?? '',
        scope_of_work: initialValues?.scope_of_work ?? '',
        scheduled_date: initialValues?.scheduled_date?.slice(0, 10) ?? '',
        due_date: initialValues?.due_date?.slice(0, 10) ?? '',
        estimated_cost: initialValues?.estimated_cost ?? null,
        notes: initialValues?.notes ?? '',
      })
    }
  }, [open, initialValues, reset])

  const status = watch('status')
  const priority = watch('priority')
  const woType = watch('wo_type')
  const clientId = watch('client_id')
  const projectId = watch('project_id')
  const assignedTo = watch('assigned_to')

  const onSubmit = async (data: WorkOrderFormData) => {
    await onSave(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input {...register('title')} placeholder="Work order title" />
            {errors.title && <p className="text-xs text-destructive mt-1">Required</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={v => setValue('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WO_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={v => setValue('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WO_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={woType ?? ''} onValueChange={v => setValue('wo_type', v || null)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {WO_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assigned To</Label>
              <Select value={assignedTo ? String(assignedTo) : ''} onValueChange={v => setValue('assigned_to', v ? Number(v) : null)}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Client</Label>
              <Select value={clientId ? String(clientId) : ''} onValueChange={v => setValue('client_id', v ? Number(v) : null)}>
                <SelectTrigger><SelectValue placeholder="No client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Project</Label>
              <Select value={projectId ? String(projectId) : ''} onValueChange={v => setValue('project_id', v ? Number(v) : null)}>
                <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.project_number} — {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Scheduled Date</Label>
              <Input type="date" {...register('scheduled_date')} />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" {...register('due_date')} />
            </div>
          </div>

          <div>
            <Label>Estimated Cost</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              onChange={e => setValue('estimated_cost', e.target.value ? parseFloat(e.target.value) : null)}
              defaultValue={initialValues?.estimated_cost ?? ''}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea {...register('description')} rows={2} placeholder="Brief description" />
          </div>

          <div>
            <Label>Scope of Work</Label>
            <Textarea {...register('scope_of_work')} rows={4} placeholder="Detailed scope of work…" />
          </div>

          <div>
            <Label>Internal Notes</Label>
            <Textarea {...register('notes')} rows={2} placeholder="Internal notes" />
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
