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
import type { Project, Client, User } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  client_id: z.number().optional(),
  project_type: z.enum(['renovation', 'tenant_improvement', 'new_construction', 'addition', 'service', 'association']),
  status: z.enum(['planning', 'bidding', 'awarded', 'active', 'punch_list', 'complete', 'cancelled']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  description: z.string().optional(),
  contract_value: z.number().optional(),
  contract_type: z.enum(['lump_sum', 'gmp', 'cost_plus', 'time_materials']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  pm_id: z.number().optional(),
  superintendent_id: z.number().optional(),
  notes: z.string().optional(),
})

export type ProjectFormData = z.infer<typeof schema>

const PROJECT_TYPES = [
  { value: 'renovation', label: 'Renovation' },
  { value: 'tenant_improvement', label: 'Tenant Improvement' },
  { value: 'new_construction', label: 'New Construction' },
  { value: 'addition', label: 'Addition' },
  { value: 'service', label: 'Service' },
  { value: 'association', label: 'Association' },
]
const STATUSES = [
  { value: 'planning', label: 'Planning' },
  { value: 'bidding', label: 'Bidding' },
  { value: 'awarded', label: 'Awarded' },
  { value: 'active', label: 'Active' },
  { value: 'punch_list', label: 'Punch List' },
  { value: 'complete', label: 'Complete' },
  { value: 'cancelled', label: 'Cancelled' },
]
const CONTRACT_TYPES = [
  { value: 'lump_sum', label: 'Lump Sum' },
  { value: 'gmp', label: 'GMP' },
  { value: 'cost_plus', label: 'Cost Plus' },
  { value: 'time_materials', label: 'Time & Materials' },
]

interface ProjectFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: ProjectFormData) => Promise<void>
  clients: Client[]
  users: User[]
  initialValues?: Partial<Project>
  title?: string
}

export function ProjectForm({ open, onOpenChange, onSave, clients, users, initialValues, title = 'New Project' }: ProjectFormProps) {
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<ProjectFormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'planning', state: 'MN' },
  })

  useEffect(() => {
    if (initialValues) {
      reset({
        name: initialValues.name ?? '',
        project_type: (initialValues.project_type as ProjectFormData['project_type']) ?? 'renovation',
        status: (initialValues.status as ProjectFormData['status']) ?? 'planning',
        client_id: initialValues.client_id ?? undefined,
        address: initialValues.address ?? '',
        city: initialValues.city ?? '',
        state: initialValues.state ?? 'MN',
        zip: initialValues.zip ?? '',
        description: initialValues.description ?? '',
        contract_value: initialValues.contract_value ?? undefined,
        contract_type: (initialValues.contract_type as ProjectFormData['contract_type']) ?? undefined,
        start_date: initialValues.start_date?.split('T')[0] ?? '',
        end_date: initialValues.end_date?.split('T')[0] ?? '',
        pm_id: initialValues.pm_id ?? undefined,
        superintendent_id: initialValues.superintendent_id ?? undefined,
        notes: initialValues.notes ?? '',
      })
    } else {
      reset({ status: 'planning', state: 'MN' })
    }
  }, [initialValues, reset, open])

  const onSubmit = async (data: ProjectFormData) => {
    await onSave(data)
  }

  const pms = users.filter(u => ['admin', 'pm'].includes(u.role))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Project Name *</Label>
              <Input {...register('name')} placeholder="e.g. 3rd Floor TI — Suite 320" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select defaultValue={initialValues?.client_id?.toString()} onValueChange={v => setValue('client_id', Number(v))}>
                <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.company_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Project Type *</Label>
              <Select defaultValue={initialValues?.project_type ?? 'renovation'} onValueChange={v => setValue('project_type', v as ProjectFormData['project_type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROJECT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select defaultValue={initialValues?.status ?? 'planning'} onValueChange={v => setValue('status', v as ProjectFormData['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Contract Type</Label>
              <Select defaultValue={initialValues?.contract_type ?? ''} onValueChange={v => setValue('contract_type', v as ProjectFormData['contract_type'])}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{CONTRACT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Contract Value ($)</Label>
              <Input type="number" placeholder="0" {...register('contract_value', { valueAsNumber: true })} />
            </div>

            <div className="space-y-1.5">
              <Label>Project Manager</Label>
              <Select defaultValue={initialValues?.pm_id?.toString()} onValueChange={v => setValue('pm_id', Number(v))}>
                <SelectTrigger><SelectValue placeholder="Select PM..." /></SelectTrigger>
                <SelectContent>{pms.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Superintendent</Label>
              <Select defaultValue={initialValues?.superintendent_id?.toString()} onValueChange={v => setValue('superintendent_id', Number(v))}>
                <SelectTrigger><SelectValue placeholder="Select super..." /></SelectTrigger>
                <SelectContent>{users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" {...register('start_date')} />
            </div>

            <div className="space-y-1.5">
              <Label>Target End Date</Label>
              <Input type="date" {...register('end_date')} />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Input {...register('address')} placeholder="Street address" />
            </div>

            <div className="space-y-1.5">
              <Label>City</Label>
              <Input {...register('city')} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input {...register('state')} defaultValue="MN" />
              </div>
              <div className="space-y-1.5">
                <Label>Zip</Label>
                <Input {...register('zip')} />
              </div>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Textarea {...register('description')} rows={2} />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Internal Notes</Label>
              <Textarea {...register('notes')} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Project'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
