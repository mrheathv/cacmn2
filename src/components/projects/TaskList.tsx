import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { toast } from '@/hooks/useToast'
import { formatDate, TASK_PRIORITY_COLORS, cn } from '@/lib/utils'
import type { Task, Milestone, User } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Plus, Pencil, Trash2, CheckSquare, Square, Calendar, User as UserIcon } from 'lucide-react'

const TASK_STATUS_COLORS: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  blocked: 'bg-red-100 text-red-700',
  done: 'bg-green-100 text-green-700',
}

const schema = z.object({
  title: z.string().min(1, 'Required'),
  description: z.string().optional(),
  milestone_id: z.number().optional(),
  assigned_to: z.number().optional(),
  status: z.enum(['todo', 'in_progress', 'blocked', 'done']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  due_date: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface TaskListProps {
  projectId: number
  tasks: Task[]
  milestones: Milestone[]
  users: User[]
  onChange: () => void
}

export function TaskList({ projectId, tasks, milestones, users, onChange }: TaskListProps) {
  const [filterMilestone, setFilterMilestone] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [dialog, setDialog] = useState<{ open: boolean; editing?: Task }>({ open: false })
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'todo', priority: 'normal' },
  })

  const filtered = tasks.filter(t => {
    if (filterMilestone !== 'all' && String(t.milestone_id ?? 'none') !== filterMilestone) return false
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    return true
  })

  const openAdd = () => {
    reset({ status: 'todo', priority: 'normal' })
    setDialog({ open: true })
  }

  const openEdit = (t: Task) => {
    reset({
      title: t.title,
      description: t.description ?? '',
      milestone_id: t.milestone_id ?? undefined,
      assigned_to: t.assigned_to ?? undefined,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date?.split('T')[0] ?? '',
    })
    setDialog({ open: true, editing: t })
  }

  const onSave = async (data: FormData) => {
    try {
      if (dialog.editing) {
        await api.put(`/projects/${projectId}/tasks/${dialog.editing.id}`, data)
        toast({ title: 'Task updated' })
      } else {
        await api.post(`/projects/${projectId}/tasks`, data)
        toast({ title: 'Task created' })
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
    await api.delete(`/projects/${projectId}/tasks/${deleteId}`)
    toast({ title: 'Task deleted' })
    setDeleteId(null)
    onChange()
  }

  const toggleDone = async (t: Task) => {
    const newStatus = t.status === 'done' ? 'todo' : 'done'
    await api.put(`/projects/${projectId}/tasks/${t.id}`, { status: newStatus })
    onChange()
  }

  const milestoneName = (id: number | null | undefined) =>
    milestones.find(m => m.id === id)?.name ?? null

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <Select value={filterMilestone} onValueChange={setFilterMilestone}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All milestones" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All milestones</SelectItem>
            <SelectItem value="none">No milestone</SelectItem>
            {milestones.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add Task</Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CheckSquare} title={tasks.length === 0 ? 'No tasks yet' : 'No tasks match filters'} description={tasks.length === 0 ? 'Break down the project work into tasks.' : undefined} action={tasks.length === 0 ? <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add Task</Button> : undefined} />
      ) : (
        <div className="space-y-1.5">
          {filtered.map(t => (
            <div key={t.id} className={cn('flex items-start gap-3 p-3 rounded-lg border bg-white group hover:bg-muted/20 transition-colors', t.status === 'done' && 'opacity-60')}>
              <button onClick={() => toggleDone(t)} className="flex-shrink-0 mt-0.5 text-muted-foreground hover:text-green-500 transition-colors">
                {t.status === 'done' ? <CheckSquare className="h-4 w-4 text-green-500" /> : <Square className="h-4 w-4" />}
              </button>

              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium', t.status === 'done' && 'line-through text-muted-foreground')}>
                  {t.title}
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {t.milestone_id && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {milestoneName(t.milestone_id)}
                    </span>
                  )}
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', TASK_PRIORITY_COLORS[t.priority])}>
                    {t.priority}
                  </span>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-full', TASK_STATUS_COLORS[t.status])}>
                    {t.status.replace('_', ' ')}
                  </span>
                  {t.due_date && (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <Calendar className="h-3 w-3" />{formatDate(t.due_date, 'MMM d')}
                    </span>
                  )}
                  {t.assigned_name && (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <UserIcon className="h-3 w-3" />{t.assigned_name}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(t.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialog.open} onOpenChange={o => setDialog({ open: o })}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{dialog.editing ? 'Edit Task' : 'Add Task'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSave)} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input {...register('title')} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea {...register('description')} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Milestone</Label>
                <Select defaultValue={dialog.editing?.milestone_id?.toString() ?? ''} onValueChange={v => setValue('milestone_id', v ? Number(v) : undefined)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {milestones.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assigned To</Label>
                <Select defaultValue={dialog.editing?.assigned_to?.toString() ?? ''} onValueChange={v => setValue('assigned_to', v ? Number(v) : undefined)}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select defaultValue={dialog.editing?.priority ?? 'normal'} onValueChange={v => setValue('priority', v as FormData['priority'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select defaultValue={dialog.editing?.status ?? 'todo'} onValueChange={v => setValue('status', v as FormData['status'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" {...register('due_date')} />
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
        title="Delete task?"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}
