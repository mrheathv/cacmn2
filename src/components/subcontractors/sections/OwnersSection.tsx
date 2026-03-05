import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Star, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { toast } from '@/hooks/useToast'
import type { Subcontractor, SubcontractorOwner } from '@/types'

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const schema = z.object({
  owner_name: z.string().min(1, 'Owner name is required'),
  title: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z
    .string()
    .email('Invalid email')
    .nullable()
    .optional()
    .or(z.literal('')),
  ownership_pct: z
    .number({ invalid_type_error: 'Must be a number' })
    .min(0, 'Min 0')
    .max(100, 'Max 100')
    .nullable()
    .optional(),
  ssn_last4: z
    .string()
    .regex(/^\d{4}$/, 'Must be exactly 4 digits')
    .nullable()
    .optional()
    .or(z.literal('')),
  is_primary: z.boolean(),
})

type FormData = z.infer<typeof schema>

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  sub: Subcontractor
  onUpdated: (updated: Subcontractor) => void
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function OwnerCard({
  owner,
  onEdit,
  onDelete,
}: {
  owner: SubcontractorOwner
  onEdit: (owner: SubcontractorOwner) => void
  onDelete: (owner: SubcontractorOwner) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{owner.owner_name}</span>
            {owner.is_primary === 1 && (
              <Badge variant="default" className="h-5 text-xs">
                <Star className="h-2.5 w-2.5 mr-1" />
                Primary
              </Badge>
            )}
          </div>
          {owner.title && (
            <p className="text-sm text-muted-foreground">{owner.title}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            {owner.ownership_pct != null && (
              <span>{owner.ownership_pct}% ownership</span>
            )}
            {owner.phone && <span>{owner.phone}</span>}
            {owner.email && <span>{owner.email}</span>}
            {[owner.city, owner.state].filter(Boolean).join(', ') && (
              <span>{[owner.city, owner.state].filter(Boolean).join(', ')}</span>
            )}
            {owner.ssn_last4 && <span>SSN: •••-••-{owner.ssn_last4}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => onEdit(owner)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(owner)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OwnersSection({ sub, onUpdated }: Props) {
  const [owners, setOwners] = useState<SubcontractorOwner[]>(sub.owners ?? [])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOwner, setEditingOwner] = useState<SubcontractorOwner | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_primary: false },
  })

  const isPrimary = watch('is_primary')

  const loadOwners = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<SubcontractorOwner[]>(`/subcontractors/${sub.id}/owners`)
      setOwners(data)
    } catch {
      toast({ title: 'Failed to load owners', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [sub.id])

  useEffect(() => {
    loadOwners()
  }, [loadOwners])

  function openAdd() {
    setEditingOwner(null)
    reset({
      owner_name: '',
      title: '',
      address: '',
      city: '',
      state: 'MN',
      zip: '',
      phone: '',
      email: '',
      ownership_pct: null,
      ssn_last4: '',
      is_primary: false,
    })
    setDialogOpen(true)
  }

  function openEdit(owner: SubcontractorOwner) {
    setEditingOwner(owner)
    reset({
      owner_name: owner.owner_name,
      title: owner.title ?? '',
      address: owner.address ?? '',
      city: owner.city ?? '',
      state: owner.state ?? 'MN',
      zip: owner.zip ?? '',
      phone: owner.phone ?? '',
      email: owner.email ?? '',
      ownership_pct: owner.ownership_pct ?? null,
      ssn_last4: owner.ssn_last4 ?? '',
      is_primary: owner.is_primary === 1,
    })
    setDialogOpen(true)
  }

  async function onSubmit(data: FormData) {
    const payload = {
      ...data,
      is_primary: data.is_primary ? 1 : 0,
      ownership_pct: data.ownership_pct ?? null,
      ssn_last4: data.ssn_last4 || null,
      email: data.email || null,
    }

    try {
      if (editingOwner) {
        await api.put<SubcontractorOwner>(
          `/subcontractors/${sub.id}/owners/${editingOwner.id}`,
          payload,
        )
        toast({ title: 'Owner updated' })
      } else {
        await api.post<SubcontractorOwner>(
          `/subcontractors/${sub.id}/owners`,
          payload,
        )
        toast({ title: 'Owner added' })
      }
      setDialogOpen(false)
      await loadOwners()
      // Refresh parent with updated sub data
      const updatedSub = await api.get<Subcontractor>(`/subcontractors/${sub.id}`)
      onUpdated(updatedSub)
    } catch {
      toast({ title: 'Save failed', description: 'Could not save owner.', variant: 'destructive' })
    }
  }

  async function handleDelete(owner: SubcontractorOwner) {
    if (!window.confirm(`Remove ${owner.owner_name} as an owner?`)) return
    setDeletingId(owner.id)
    try {
      await api.delete(`/subcontractors/${sub.id}/owners/${owner.id}`)
      toast({ title: 'Owner removed' })
      await loadOwners()
      const updatedSub = await api.get<Subcontractor>(`/subcontractors/${sub.id}`)
      onUpdated(updatedSub)
    } catch {
      toast({ title: 'Delete failed', description: 'Could not remove owner.', variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Owners &amp; Principals
            {owners.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {owners.length}
              </Badge>
            )}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Owner
          </Button>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
          ) : owners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No owners on record.</p>
              <p className="text-xs mt-1">Add owners and principals to track ownership structure.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {owners.map((owner) => (
                <OwnerCard
                  key={owner.id}
                  owner={owner}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
              {deletingId !== null && (
                <p className="text-xs text-muted-foreground text-center">Removing…</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Add / Edit Dialog */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOwner ? 'Edit Owner' : 'Add Owner'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* Name + Title */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Owner Name *</Label>
                <Input {...register('owner_name')} placeholder="Jane Smith" />
                {errors.owner_name && (
                  <p className="text-xs text-destructive">{errors.owner_name.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input {...register('title')} placeholder="CEO, Member, Partner…" />
              </div>
              <div className="space-y-1">
                <Label>Ownership %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  placeholder="50"
                  {...register('ownership_pct', {
                    setValueAs: (v: string) => (v === '' ? null : parseFloat(v)),
                  })}
                />
                {errors.ownership_pct && (
                  <p className="text-xs text-destructive">{errors.ownership_pct.message}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Address
              </p>
              <div className="space-y-2">
                <Input {...register('address')} placeholder="Street address" />
                <div className="grid grid-cols-3 gap-2">
                  <Input {...register('city')} placeholder="City" className="col-span-1" />
                  <Input {...register('state')} placeholder="State" maxLength={2} />
                  <Input {...register('zip')} placeholder="ZIP" />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input {...register('phone')} placeholder="(612) 555-0100" type="tel" />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input {...register('email')} placeholder="jane@acme.com" type="email" />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* SSN Last 4 */}
            <div className="space-y-1">
              <Label>SSN Last 4 Digits</Label>
              <Input
                {...register('ssn_last4')}
                placeholder="1234"
                maxLength={4}
                className="max-w-[8rem]"
              />
              {errors.ssn_last4 && (
                <p className="text-xs text-destructive">{errors.ssn_last4.message}</p>
              )}
              <p className="text-xs text-muted-foreground">Used for 1099-NEC reporting only.</p>
            </div>

            {/* Primary toggle */}
            <div className="flex items-center gap-3 rounded-md border p-3">
              <input
                type="checkbox"
                id="is_primary"
                checked={isPrimary}
                onChange={(e) => setValue('is_primary', e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <div>
                <Label htmlFor="is_primary" className="cursor-pointer font-medium">
                  Primary Owner / Principal
                </Label>
                <p className="text-xs text-muted-foreground">
                  Designates the main point of contact for compliance purposes.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : editingOwner ? 'Save Changes' : 'Add Owner'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
