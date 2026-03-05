import { useEffect, useState, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileUpload, FileList } from '@/components/shared/FileUpload'
import { api } from '@/lib/api'
import { toast } from '@/hooks/useToast'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Subcontractor, SubcontractorContract, Project, Document } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<SubcontractorContract['status'], string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  complete: 'bg-blue-100 text-blue-700',
  terminated: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<SubcontractorContract['status'], string> = {
  draft: 'Draft',
  active: 'Active',
  complete: 'Complete',
  terminated: 'Terminated',
}

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  lump_sum: 'Lump Sum',
  unit_price: 'Unit Price',
  time_materials: 'Time & Materials',
}

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const schema = z.object({
  contract_title: z.string().min(1, 'Contract title is required'),
  project_id: z.number().nullable().optional(),
  scope_of_work: z.string().nullable().optional(),
  payment_terms: z.enum(['lump_sum', 'unit_price', 'time_materials']).nullable().optional(),
  contract_value: z
    .number({ invalid_type_error: 'Must be a number' })
    .nonnegative('Must be non-negative')
    .nullable()
    .optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  status: z.enum(['draft', 'active', 'complete', 'terminated']),
  responsible_for_completion: z.boolean().optional(),
  written_contract_on_file: z.boolean().optional(),
  notes: z.string().nullable().optional(),
})

type FormData = z.infer<typeof schema>

// ---------------------------------------------------------------------------
// ContractRow component
// ---------------------------------------------------------------------------

function ContractRow({
  contract,
  projects,
  docs,
  onEdit,
  onDelete,
  onUploaded,
  onDocDeleted,
}: {
  contract: SubcontractorContract
  projects: Project[]
  docs: Document[]
  onEdit: (c: SubcontractorContract) => void
  onDelete: (c: SubcontractorContract) => void
  onUploaded: (doc: Document) => void
  onDocDeleted: (id: number) => void
}) {
  const [uploadOpen, setUploadOpen] = useState(false)

  const linkedProject = contract.project_id
    ? projects.find(p => p.id === contract.project_id)
    : null

  return (
    <div className="rounded-lg border bg-card">
      {/* Main row */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-foreground truncate">
              {contract.contract_title}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[contract.status]}`}
            >
              {STATUS_LABELS[contract.status]}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {linkedProject ? (
              <span>
                Project:{' '}
                <span className="font-medium text-foreground">
                  {linkedProject.project_number} – {linkedProject.name}
                </span>
              </span>
            ) : contract.project_number ? (
              <span>
                Project:{' '}
                <span className="font-medium text-foreground">
                  {contract.project_number}
                  {contract.project_name ? ` – ${contract.project_name}` : ''}
                </span>
              </span>
            ) : null}

            {contract.payment_terms && (
              <span>{PAYMENT_TERMS_LABELS[contract.payment_terms] ?? contract.payment_terms}</span>
            )}

            {contract.contract_value != null && (
              <span className="font-medium text-foreground">
                {formatCurrency(contract.contract_value)}
              </span>
            )}

            {(contract.start_date || contract.end_date) && (
              <span>
                {formatDate(contract.start_date)}
                {contract.end_date ? ` – ${formatDate(contract.end_date)}` : ''}
              </span>
            )}
          </div>

          {/* Flags */}
          <div className="flex gap-2 mt-2 flex-wrap">
            {contract.responsible_for_completion === 1 && (
              <Badge variant="outline" className="text-xs h-5">
                Sub Responsible for Completion
              </Badge>
            )}
            {contract.written_contract_on_file === 1 && (
              <Badge variant="outline" className="text-xs h-5">
                Contract on File
              </Badge>
            )}
          </div>

          {contract.scope_of_work && (
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
              {contract.scope_of_work}
            </p>
          )}
          {contract.notes && (
            <p className="mt-1 text-xs text-muted-foreground italic line-clamp-1">
              {contract.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(contract)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(contract)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Document section */}
      <div className="border-t px-4 pb-3 pt-2">
        <button
          type="button"
          onClick={() => setUploadOpen(v => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {uploadOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {uploadOpen ? 'Hide' : 'Upload Signed Contract'}
          {docs.length > 0 && (
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
              {docs.length}
            </span>
          )}
        </button>

        {uploadOpen && (
          <div className="mt-3 space-y-3">
            <FileList documents={docs} onDeleted={onDocDeleted} />
            <FileUpload
              entityType="subcontractor_contract"
              entityId={contract.id}
              complianceCriterion={8}
              onUploaded={onUploaded}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  sub: Subcontractor
}

export function ContractsSection({ sub }: Props) {
  const [contracts, setContracts] = useState<SubcontractorContract[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [docsByContract, setDocsByContract] = useState<Record<number, Document[]>>({})
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingContract, setEditingContract] = useState<SubcontractorContract | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      contract_title: '',
      project_id: null,
      scope_of_work: '',
      payment_terms: null,
      contract_value: null,
      start_date: '',
      end_date: '',
      status: 'draft',
      responsible_for_completion: false,
      written_contract_on_file: false,
      notes: '',
    },
  })

  const watchResponsible = form.watch('responsible_for_completion')
  const watchContractOnFile = form.watch('written_contract_on_file')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [contractsData, projectsData] = await Promise.all([
        api.get<SubcontractorContract[]>(`/subcontractors/${sub.id}/contracts`),
        api.get<Project[]>('/projects'),
      ])
      setContracts(contractsData)
      setProjects(projectsData)
    } catch {
      toast({ title: 'Failed to load contracts', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [sub.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  function openAdd() {
    setEditingContract(null)
    form.reset({
      contract_title: '',
      project_id: null,
      scope_of_work: '',
      payment_terms: null,
      contract_value: null,
      start_date: '',
      end_date: '',
      status: 'draft',
      responsible_for_completion: false,
      written_contract_on_file: false,
      notes: '',
    })
    setDialogOpen(true)
  }

  function openEdit(contract: SubcontractorContract) {
    setEditingContract(contract)
    form.reset({
      contract_title: contract.contract_title,
      project_id: contract.project_id ?? null,
      scope_of_work: contract.scope_of_work ?? '',
      payment_terms: contract.payment_terms ?? null,
      contract_value: contract.contract_value ?? null,
      start_date: contract.start_date ?? '',
      end_date: contract.end_date ?? '',
      status: contract.status,
      responsible_for_completion: contract.responsible_for_completion === 1,
      written_contract_on_file: contract.written_contract_on_file === 1,
      notes: contract.notes ?? '',
    })
    setDialogOpen(true)
  }

  async function onSubmit(data: FormData) {
    setSaving(true)
    const payload = {
      ...data,
      project_id: data.project_id ?? null,
      scope_of_work: data.scope_of_work || null,
      payment_terms: data.payment_terms ?? null,
      contract_value: data.contract_value ?? null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      responsible_for_completion: data.responsible_for_completion ? 1 : 0,
      written_contract_on_file: data.written_contract_on_file ? 1 : 0,
      notes: data.notes || null,
    }
    try {
      if (editingContract) {
        const updated = await api.put<SubcontractorContract>(
          `/subcontractors/${sub.id}/contracts/${editingContract.id}`,
          payload,
        )
        setContracts(prev => prev.map(c => (c.id === updated.id ? updated : c)))
        toast({ title: 'Contract updated' })
      } else {
        const created = await api.post<SubcontractorContract>(
          `/subcontractors/${sub.id}/contracts`,
          payload,
        )
        setContracts(prev => [...prev, created])
        toast({ title: 'Contract added' })
      }
      setDialogOpen(false)
    } catch {
      toast({ title: 'Save failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(contract: SubcontractorContract) {
    if (!window.confirm(`Delete contract "${contract.contract_title}"?`)) return
    setDeleting(contract.id)
    try {
      await api.delete(`/subcontractors/${sub.id}/contracts/${contract.id}`)
      setContracts(prev => prev.filter(c => c.id !== contract.id))
      setDocsByContract(prev => {
        const next = { ...prev }
        delete next[contract.id]
        return next
      })
      toast({ title: 'Contract deleted' })
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    } finally {
      setDeleting(null)
    }
  }

  function handleDocUploaded(contractId: number, doc: Document) {
    setDocsByContract(prev => ({
      ...prev,
      [contractId]: [...(prev[contractId] ?? []), doc],
    }))
  }

  function handleDocDeleted(contractId: number, docId: number) {
    setDocsByContract(prev => ({
      ...prev,
      [contractId]: (prev[contractId] ?? []).filter(d => d.id !== docId),
    }))
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Contracts
            {contracts.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {contracts.length}
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" onClick={openAdd} disabled={deleting !== null}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Contract
          </Button>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : contracts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No contracts on file.</p>
              <p className="text-xs mt-1">Add contracts to track scope, value, and status.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map(contract => (
                <ContractRow
                  key={contract.id}
                  contract={contract}
                  projects={projects}
                  docs={docsByContract[contract.id] ?? []}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onUploaded={doc => handleDocUploaded(contract.id, doc)}
                  onDocDeleted={id => handleDocDeleted(contract.id, id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContract ? 'Edit Contract' : 'Add Contract'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
            {/* Contract Title */}
            <div className="space-y-1.5">
              <Label>Contract Title *</Label>
              <Input
                {...form.register('contract_title')}
                placeholder="e.g. Electrical Work – Phase 1"
              />
              {form.formState.errors.contract_title && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.contract_title.message}
                </p>
              )}
            </div>

            {/* Project */}
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Controller
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <Select
                    value={field.value != null ? String(field.value) : 'none'}
                    onValueChange={v => field.onChange(v === 'none' ? null : Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.project_number} – {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Scope of Work */}
            <div className="space-y-1.5">
              <Label>Scope of Work</Label>
              <Textarea
                {...form.register('scope_of_work')}
                rows={3}
                placeholder="Describe the scope of work covered by this contract…"
              />
            </div>

            {/* Payment Terms + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Payment Terms</Label>
                <Controller
                  control={form.control}
                  name="payment_terms"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? 'none'}
                      onValueChange={v => field.onChange(v === 'none' ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select terms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        <SelectItem value="lump_sum">Lump Sum</SelectItem>
                        <SelectItem value="unit_price">Unit Price</SelectItem>
                        <SelectItem value="time_materials">Time & Materials</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="complete">Complete</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.status && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.status.message}
                  </p>
                )}
              </div>
            </div>

            {/* Contract Value */}
            <div className="space-y-1.5">
              <Label>Contract Value ($)</Label>
              <Input
                type="number"
                min={0}
                step={100}
                placeholder="0"
                {...form.register('contract_value', {
                  setValueAs: (v: string) => (v === '' ? null : Number(v)),
                })}
              />
              {form.formState.errors.contract_value && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.contract_value.message}
                </p>
              )}
            </div>

            {/* Start / End Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" {...form.register('start_date')} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" {...form.register('end_date')} />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-2.5 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <input
                  id="responsible_for_completion"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={watchResponsible ?? false}
                  onChange={e => form.setValue('responsible_for_completion', e.target.checked)}
                />
                <Label htmlFor="responsible_for_completion" className="cursor-pointer font-normal">
                  Subcontractor responsible for completion
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="written_contract_on_file"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={watchContractOnFile ?? false}
                  onChange={e => form.setValue('written_contract_on_file', e.target.checked)}
                />
                <Label htmlFor="written_contract_on_file" className="cursor-pointer font-normal">
                  Written contract uploaded / on file
                </Label>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea {...form.register('notes')} rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingContract ? 'Save Changes' : 'Add Contract'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
