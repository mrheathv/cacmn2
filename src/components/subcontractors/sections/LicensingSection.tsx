import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileUpload, FileList } from '@/components/shared/FileUpload'
import { api } from '@/lib/api'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/utils'
import type { Subcontractor, SubcontractorLicense, Document } from '@/types'

const LICENSE_TYPE_LABELS: Record<SubcontractorLicense['license_type'], string> = {
  general_contractor: 'General Contractor',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  hvac: 'HVAC',
  dli: 'DLI Registration',
  other: 'Other',
}

const schema = z.object({
  license_type: z.enum(['general_contractor', 'electrical', 'plumbing', 'hvac', 'dli', 'other']),
  license_number: z.string().min(1, 'License number is required'),
  issuing_authority: z.string().nullable().optional(),
  state: z.string().max(2).nullable().optional(),
  expiration_date: z.string().nullable().optional(),
  specialty_trade: z.string().nullable().optional(),
  is_primary: z.boolean().optional(),
  notes: z.string().nullable().optional(),
})

type FormData = z.infer<typeof schema>

function isExpired(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

interface Props {
  sub: Subcontractor
}

export function LicensingSection({ sub }: Props) {
  const [licenses, setLicenses] = useState<SubcontractorLicense[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLicense, setEditingLicense] = useState<SubcontractorLicense | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      license_type: 'general_contractor',
      license_number: '',
      issuing_authority: '',
      state: 'MN',
      expiration_date: '',
      specialty_trade: '',
      is_primary: false,
      notes: '',
    },
  })

  const watchIsPrimary = form.watch('is_primary')

  useEffect(() => {
    Promise.all([
      api.get<SubcontractorLicense[]>(`/subcontractors/${sub.id}/licenses`),
      api.get<Document[]>(`/documents?entity_type=subcontractor_license&entity_id=${sub.id}`),
    ])
      .then(([lics, docs]) => {
        setLicenses(lics)
        setDocuments(docs)
      })
      .catch(() => toast({ title: 'Failed to load licenses', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [sub.id])

  function openAdd() {
    form.reset({
      license_type: 'general_contractor',
      license_number: '',
      issuing_authority: '',
      state: 'MN',
      expiration_date: '',
      specialty_trade: '',
      is_primary: false,
      notes: '',
    })
    setEditingLicense(null)
    setDialogOpen(true)
  }

  function openEdit(lic: SubcontractorLicense) {
    form.reset({
      license_type: lic.license_type,
      license_number: lic.license_number,
      issuing_authority: lic.issuing_authority ?? '',
      state: lic.state ?? 'MN',
      expiration_date: lic.expiration_date ?? '',
      specialty_trade: lic.specialty_trade ?? '',
      is_primary: lic.is_primary === 1,
      notes: lic.notes ?? '',
    })
    setEditingLicense(lic)
    setDialogOpen(true)
  }

  async function onSubmit(data: FormData) {
    setSaving(true)
    const payload = {
      ...data,
      is_primary: data.is_primary ? 1 : 0,
      expiration_date: data.expiration_date || null,
      issuing_authority: data.issuing_authority || null,
      state: data.state || null,
      specialty_trade: data.specialty_trade || null,
      notes: data.notes || null,
    }
    try {
      if (editingLicense) {
        const updated = await api.put<SubcontractorLicense>(
          `/subcontractors/${sub.id}/licenses/${editingLicense.id}`,
          payload,
        )
        setLicenses(prev => prev.map(l => (l.id === updated.id ? updated : l)))
        toast({ title: 'License updated' })
      } else {
        const created = await api.post<SubcontractorLicense>(
          `/subcontractors/${sub.id}/licenses`,
          payload,
        )
        setLicenses(prev => [...prev, created])
        toast({ title: 'License added' })
      }
      setDialogOpen(false)
    } catch {
      toast({ title: 'Save failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(lic: SubcontractorLicense) {
    if (!window.confirm(`Delete ${LICENSE_TYPE_LABELS[lic.license_type]} license "${lic.license_number}"?`)) return
    setDeleting(lic.id)
    try {
      await api.delete(`/subcontractors/${sub.id}/licenses/${lic.id}`)
      setLicenses(prev => prev.filter(l => l.id !== lic.id))
      toast({ title: 'License deleted' })
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Legacy data notice */}
      <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>Note: License data from the legacy system is shown below if present.</span>
      </div>

      {/* Legacy license data */}
      {(sub.license_number || sub.license_expiry) && (
        <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <p className="mb-1 font-medium text-gray-600">Legacy License Record</p>
          {sub.license_number && (
            <p>
              <span className="font-medium">License #:</span> {sub.license_number}
              {sub.license_state && ` (${sub.license_state})`}
            </p>
          )}
          {sub.license_expiry && (
            <p className="flex items-center gap-1">
              <span className="font-medium">Expiry:</span>
              <span className={isExpired(sub.license_expiry) ? 'font-semibold text-red-600' : ''}>
                {formatDate(sub.license_expiry)}
              </span>
              {isExpired(sub.license_expiry) && (
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              )}
            </p>
          )}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Licenses</CardTitle>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-1 h-4 w-4" />
            Add License
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : licenses.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No licenses on file.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 pr-4 font-medium">License #</th>
                    <th className="pb-2 pr-4 font-medium">State</th>
                    <th className="pb-2 pr-4 font-medium">Expiry</th>
                    <th className="pb-2 pr-4 font-medium">Primary</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map(lic => {
                    const expired = isExpired(lic.expiration_date)
                    return (
                      <tr key={lic.id} className="border-b last:border-0">
                        <td className="py-2.5 pr-4 font-medium">
                          {LICENSE_TYPE_LABELS[lic.license_type]}
                          {lic.specialty_trade && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({lic.specialty_trade})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-xs">{lic.license_number}</td>
                        <td className="py-2.5 pr-4">{lic.state ?? '—'}</td>
                        <td className="py-2.5 pr-4">
                          {lic.expiration_date ? (
                            <span
                              className={`flex items-center gap-1 ${expired ? 'font-semibold text-red-600' : ''}`}
                            >
                              {expired && <AlertTriangle className="h-3.5 w-3.5" />}
                              {formatDate(lic.expiration_date)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2.5 pr-4">
                          {lic.is_primary === 1 ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Primary
                            </Badge>
                          ) : null}
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(lic)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              disabled={deleting === lic.id}
                              onClick={() => handleDelete(lic)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document upload */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">License Certificates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FileList
            documents={documents}
            onDeleted={id => setDocuments(prev => prev.filter(d => d.id !== id))}
          />
          <FileUpload
            entityType="subcontractor_license"
            entityId={sub.id}
            onUploaded={doc => setDocuments(prev => [...prev, doc])}
          />
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLicense ? 'Edit License' : 'Add License'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* License Type */}
            <div className="space-y-1.5">
              <Label>License Type *</Label>
              <Controller
                control={form.control}
                name="license_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(LICENSE_TYPE_LABELS) as [SubcontractorLicense['license_type'], string][]).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.license_type && (
                <p className="text-xs text-destructive">{form.formState.errors.license_type.message}</p>
              )}
            </div>

            {/* License Number */}
            <div className="space-y-1.5">
              <Label>License Number *</Label>
              <Input {...form.register('license_number')} />
              {form.formState.errors.license_number && (
                <p className="text-xs text-destructive">{form.formState.errors.license_number.message}</p>
              )}
            </div>

            {/* Issuing Authority */}
            <div className="space-y-1.5">
              <Label>Issuing Authority</Label>
              <Input {...form.register('issuing_authority')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* State */}
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input {...form.register('state')} maxLength={2} placeholder="MN" />
              </div>

              {/* Expiration Date */}
              <div className="space-y-1.5">
                <Label>Expiration Date</Label>
                <Input type="date" {...form.register('expiration_date')} />
              </div>
            </div>

            {/* Specialty Trade */}
            <div className="space-y-1.5">
              <Label>Specialty Trade</Label>
              <Input
                {...form.register('specialty_trade')}
                placeholder="e.g. Plumbing Contractor"
              />
            </div>

            {/* Is Primary */}
            <div className="flex items-center gap-2">
              <input
                id="is_primary"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={watchIsPrimary ?? false}
                onChange={e => form.setValue('is_primary', e.target.checked)}
              />
              <Label htmlFor="is_primary" className="cursor-pointer font-normal">
                Mark as primary license
              </Label>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea {...form.register('notes')} rows={3} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingLicense ? 'Save Changes' : 'Add License'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
