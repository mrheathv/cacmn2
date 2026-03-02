import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Lead, Client, User } from '@/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { toast } from '@/hooks/useToast'
import { formatCurrency, formatDate, LEAD_STAGE_COLORS } from '@/lib/utils'
import { Plus, Users, DollarSign, Calendar } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const STAGES = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const
const STAGE_LABELS: Record<string, string> = {
  new: 'New', qualified: 'Qualified', proposal: 'Proposal',
  negotiation: 'Negotiation', won: 'Won', lost: 'Lost',
}

const schema = z.object({
  title: z.string().min(1, 'Required'),
  client_id: z.number().optional(),
  description: z.string().optional(),
  estimated_value: z.number().optional(),
  stage: z.enum(STAGES).optional(),
  source: z.enum(['referral', 'repeat', 'cold', 'bid_board', 'website', 'other']).optional(),
  probability: z.number().min(0).max(100).optional(),
  expected_close: z.string().optional(),
  assigned_to: z.number().optional(),
})
type FormData = z.infer<typeof schema>

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { stage: 'new', probability: 50 },
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [l, c, u] = await Promise.all([
      api.get<Lead[]>('/leads'),
      api.get<Client[]>('/clients'),
      api.get<User[]>('/users').catch(() => [] as User[]),
    ])
    setLeads(l); setClients(c); setUsers(u)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/leads', data)
      toast({ title: 'Lead created' })
      setOpen(false)
      reset()
      load()
    } catch (e) {
      toast({ title: 'Error', description: String(e), variant: 'destructive' })
    }
  }

  const moveStage = async (leadId: number, stage: string) => {
    try {
      await api.put(`/leads/${leadId}`, { stage })
      setLeads(ls => ls.map(l => l.id === leadId ? { ...l, stage: stage as Lead['stage'] } : l))
    } catch {
      toast({ title: 'Failed to update stage', variant: 'destructive' })
    }
  }

  const handleDrop = (stage: string) => (e: React.DragEvent) => {
    e.preventDefault()
    if (dragging !== null) {
      moveStage(dragging, stage)
      setDragging(null)
    }
  }

  const stageLeads = (stage: string) => leads.filter(l => l.stage === stage)

  const stageTotal = (stage: string) =>
    leads.filter(l => l.stage === stage).reduce((s, l) => s + (l.estimated_value ?? 0), 0)

  if (loading) return <div className="p-6"><div className="h-64 bg-muted rounded animate-pulse" /></div>

  return (
    <div className="p-6">
      <PageHeader
        title="Leads"
        subtitle={`${leads.length} leads · ${formatCurrency(leads.reduce((s, l) => s + (l.estimated_value ?? 0), 0))} pipeline`}
        actions={
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Lead</Button>
        }
      />

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.filter(s => s !== 'lost').map(stage => (
          <div
            key={stage}
            className="flex-shrink-0 w-64"
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop(stage)}
          >
            {/* Column header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LEAD_STAGE_COLORS[stage]}`}>
                  {STAGE_LABELS[stage]}
                </span>
                <span className="text-xs text-muted-foreground">({stageLeads(stage).length})</span>
              </div>
              {stageTotal(stage) > 0 && (
                <span className="text-xs font-medium text-muted-foreground">{formatCurrency(stageTotal(stage))}</span>
              )}
            </div>

            {/* Cards */}
            <div className="space-y-2 min-h-[120px]">
              {stageLeads(stage).length === 0 && (
                <div className="h-20 border-2 border-dashed rounded-lg border-muted flex items-center justify-center text-xs text-muted-foreground">
                  Drop here
                </div>
              )}
              {stageLeads(stage).map(lead => (
                <Card
                  key={lead.id}
                  draggable
                  onDragStart={() => setDragging(lead.id)}
                  onDragEnd={() => setDragging(null)}
                  className={`cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${dragging === lead.id ? 'opacity-50' : ''}`}
                >
                  <CardContent className="p-3 space-y-1.5">
                    <p className="font-medium text-sm leading-snug">{lead.title}</p>
                    {lead.company_name && (
                      <p className="text-xs text-muted-foreground">{lead.company_name}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {lead.estimated_value != null && (
                        <span className="flex items-center gap-0.5 text-xs text-green-700">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(lead.estimated_value)}
                        </span>
                      )}
                      {lead.expected_close && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(lead.expected_close, 'MMM d')}
                        </span>
                      )}
                    </div>
                    {lead.probability != null && (
                      <div className="w-full bg-muted rounded-full h-1">
                        <div
                          className="bg-primary h-1 rounded-full"
                          style={{ width: `${lead.probability}%` }}
                        />
                      </div>
                    )}
                    {lead.assigned_name && (
                      <p className="text-xs text-muted-foreground">{lead.assigned_name}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {/* Lost column */}
        <div className="flex-shrink-0 w-48">
          <div className="mb-3 flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LEAD_STAGE_COLORS['lost']}`}>Lost</span>
            <span className="text-xs text-muted-foreground">({stageLeads('lost').length})</span>
          </div>
          <div className="space-y-2 min-h-[120px]"
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop('lost')}
          >
            {stageLeads('lost').slice(0, 5).map(lead => (
              <div key={lead.id} className="text-xs text-muted-foreground border rounded px-2 py-1.5 truncate">
                {lead.title}
              </div>
            ))}
            {stageLeads('lost').length === 0 && (
              <div className="h-20 border-2 border-dashed rounded-lg border-muted flex items-center justify-center text-xs text-muted-foreground">
                Drop here
              </div>
            )}
          </div>
        </div>
      </div>

      {leads.length === 0 && !loading && (
        <EmptyState icon={Users} title="No leads yet" description="Track your sales pipeline by adding leads." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Lead</Button>} />
      )}

      {/* New Lead Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input {...register('title')} placeholder="e.g. Office TI - Suite 400" />
            </div>
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select onValueChange={v => setValue('client_id', Number(v))}>
                <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Est. Value</Label>
                <Input type="number" {...register('estimated_value', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>Probability %</Label>
                <Input type="number" min="0" max="100" {...register('probability', { valueAsNumber: true })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select defaultValue="new" onValueChange={v => setValue('stage', v as FormData['stage'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select onValueChange={v => setValue('source', v as FormData['source'])}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {['referral', 'repeat', 'cold', 'bid_board', 'website', 'other'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Expected Close</Label>
              <Input type="date" {...register('expected_close')} />
            </div>
            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Select onValueChange={v => setValue('assigned_to', Number(v))}>
                <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea {...register('description')} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Lead'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
