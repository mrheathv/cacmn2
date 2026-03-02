import { useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { toast } from '@/hooks/useToast'
import { formatDate, cn } from '@/lib/utils'
import type { Milestone } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { GripVertical, Plus, Pencil, Trash2, CheckCircle2, Circle, Flag } from 'lucide-react'

const MILESTONE_STATUS_COLORS = {
  pending: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  complete: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
}

const schema = z.object({
  name: z.string().min(1, 'Required'),
  description: z.string().optional(),
  due_date: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'complete', 'overdue']).optional(),
})
type FormData = z.infer<typeof schema>

function SortableRow({ milestone, onEdit, onDelete, onToggle }: {
  milestone: Milestone
  onEdit: (m: Milestone) => void
  onDelete: (id: number) => void
  onToggle: (m: Milestone) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: milestone.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 py-3 px-3 rounded-lg border bg-white group',
        isDragging ? 'opacity-50 shadow-lg' : 'hover:bg-muted/30'
      )}
    >
      <button {...attributes} {...listeners} className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0">
        <GripVertical className="h-4 w-4" />
      </button>

      <button
        onClick={() => onToggle(milestone)}
        className={cn('flex-shrink-0 transition-colors', milestone.status === 'complete' ? 'text-green-500' : 'text-muted-foreground/40 hover:text-green-400')}
        title={milestone.status === 'complete' ? 'Mark incomplete' : 'Mark complete'}
      >
        {milestone.status === 'complete'
          ? <CheckCircle2 className="h-5 w-5" />
          : <Circle className="h-5 w-5" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn('font-medium text-sm', milestone.status === 'complete' && 'line-through text-muted-foreground')}>
          {milestone.name}
        </p>
        {milestone.description && <p className="text-xs text-muted-foreground truncate">{milestone.description}</p>}
      </div>

      <StatusBadge status={milestone.status} colorMap={MILESTONE_STATUS_COLORS} className="flex-shrink-0" />

      {milestone.due_date && (
        <span className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1">
          <Flag className="h-3 w-3" />
          {formatDate(milestone.due_date)}
        </span>
      )}

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(milestone)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(milestone.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

interface MilestoneListProps {
  projectId: number
  milestones: Milestone[]
  onChange: () => void
}

export function MilestoneList({ projectId, milestones, onChange }: MilestoneListProps) {
  const [items, setItems] = useState(milestones)
  const [dialog, setDialog] = useState<{ open: boolean; editing?: Milestone }>({ open: false })
  const [deleteId, setDeleteId] = useState<number | null>(null)

  // Sync when parent refreshes
  if (JSON.stringify(items.map(i => i.id)) !== JSON.stringify(milestones.map(m => m.id))) {
    setItems(milestones)
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'pending' },
  })

  const openAdd = () => {
    reset({ status: 'pending' })
    setDialog({ open: true })
  }

  const openEdit = (m: Milestone) => {
    reset({
      name: m.name,
      description: m.description ?? '',
      due_date: m.due_date?.split('T')[0] ?? '',
      status: m.status,
    })
    setDialog({ open: true, editing: m })
  }

  const onSave = async (data: FormData) => {
    try {
      if (dialog.editing) {
        await api.put(`/projects/${projectId}/milestones/${dialog.editing.id}`, data)
        toast({ title: 'Milestone updated' })
      } else {
        await api.post(`/projects/${projectId}/milestones`, data)
        toast({ title: 'Milestone added' })
      }
      setDialog({ open: false })
      reset()
      onChange()
    } catch (e) {
      toast({ title: 'Error', description: String(e), variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await api.delete(`/projects/${projectId}/milestones/${deleteId}`)
    toast({ title: 'Milestone deleted' })
    setDeleteId(null)
    onChange()
  }

  const handleToggle = async (m: Milestone) => {
    const newStatus = m.status === 'complete' ? 'pending' : 'complete'
    await api.put(`/projects/${projectId}/milestones/${m.id}`, {
      status: newStatus,
      completed_date: newStatus === 'complete' ? new Date().toISOString() : null,
    })
    onChange()
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = items.findIndex(i => i.id === active.id)
    const newIdx = items.findIndex(i => i.id === over.id)
    const reordered = arrayMove(items, oldIdx, newIdx)
    setItems(reordered)
    await api.patch(`/projects/${projectId}/milestones/reorder`, { ids: reordered.map(i => i.id) })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          {items.length} milestone{items.length !== 1 ? 's' : ''}
        </h3>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add Milestone</Button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Flag} title="No milestones" description="Break the project into key phases and deadlines." action={<Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add Milestone</Button>} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map(m => (
                <SortableRow key={m.id} milestone={m} onEdit={openEdit} onDelete={setDeleteId} onToggle={handleToggle} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={dialog.open} onOpenChange={o => setDialog({ open: o })}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{dialog.editing ? 'Edit Milestone' : 'Add Milestone'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSave)} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input {...register('name')} placeholder="e.g. Permit Approval" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea {...register('description')} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" {...register('due_date')} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select defaultValue={dialog.editing?.status ?? 'pending'} onValueChange={v => setValue('status', v as FormData['status'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog({ open: false })}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={o => !o && setDeleteId(null)}
        title="Delete milestone?"
        description="Tasks under this milestone will be unlinked but not deleted."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}
