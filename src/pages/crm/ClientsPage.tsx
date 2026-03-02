import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Client } from '@/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { SearchInput } from '@/components/shared/SearchInput'
import { EmptyState } from '@/components/shared/EmptyState'
import { toast } from '@/hooks/useToast'
import { Plus, Building2, ExternalLink } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const CLIENT_STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  prospect: 'bg-blue-100 text-blue-700',
}

const schema = z.object({
  company_name: z.string().min(1, 'Required'),
  industry: z.string().optional(),
  website: z.string().optional(),
  billing_address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'prospect']).optional(),
})
type FormData = z.infer<typeof schema>

const INDUSTRIES = ['retail', 'office', 'medical', 'hospitality', 'industrial', 'education', 'government', 'association', 'other']

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'active', state: 'MN' },
  })

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    const data = await api.get<Client[]>(`/clients?${params}`)
    setClients(data)
    setLoading(false)
  }, [search, statusFilter])

  useEffect(() => { load() }, [load])

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/clients', data)
      toast({ title: 'Client created' })
      setOpen(false)
      reset()
      load()
    } catch (e) {
      toast({ title: 'Error', description: String(e), variant: 'destructive' })
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length !== 1 ? 's' : ''}`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New Client
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Search clients..." className="max-w-sm" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}</div>
      ) : clients.length === 0 ? (
        <EmptyState icon={Building2} title="No clients found" description="Add your first client to get started." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Client</Button>} />
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Industry</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">City</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y">
              {clients.map(c => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/clients/${c.id}`} className="font-medium text-foreground hover:text-primary">
                      {c.company_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{c.industry?.replace('_', ' ') ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.city ? `${c.city}, ${c.state}` : '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} colorMap={CLIENT_STATUS_COLORS} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/clients/${c.id}`} className="text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Client Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Client</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input {...register('company_name')} />
              {errors.company_name && <p className="text-xs text-destructive">{errors.company_name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Select onValueChange={v => setValue('industry', v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select defaultValue="active" onValueChange={v => setValue('status', v as FormData['status'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input placeholder="https://" {...register('website')} />
            </div>
            <div className="space-y-1.5">
              <Label>Billing Address</Label>
              <Input {...register('billing_address')} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 space-y-1.5">
                <Label>City</Label>
                <Input {...register('city')} />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input {...register('state')} defaultValue="MN" />
              </div>
              <div className="space-y-1.5">
                <Label>Zip</Label>
                <Input {...register('zip')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea {...register('notes')} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Create Client'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
