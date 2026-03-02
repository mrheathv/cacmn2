import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Client, Contact, Project, Estimate } from '@/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { toast } from '@/hooks/useToast'
import { formatCurrency, formatDate, formatDateTime, PROJECT_STATUS_COLORS, ESTIMATE_STATUS_COLORS } from '@/lib/utils'
import { Plus, Phone, Mail, Star, Pencil, Trash2, Globe, MapPin } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

type ClientDetail = Client & { contacts: Contact[] }

const contactSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  title: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  is_primary: z.boolean().optional(),
  notes: z.string().optional(),
})
type ContactForm = z.infer<typeof contactSchema>

const activitySchema = z.object({
  activity_type: z.enum(['call', 'email', 'meeting', 'note', 'site_visit']),
  subject: z.string().min(1, 'Required'),
  body: z.string().optional(),
})
type ActivityForm = z.infer<typeof activitySchema>

const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note', 'site_visit']

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [contactDialog, setContactDialog] = useState<{ open: boolean; editing?: Contact }>({ open: false })
  const [activityDialog, setActivityDialog] = useState(false)
  const [deleteContact, setDeleteContact] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  interface ActivityRow {
    id: number; activity_type: string; subject: string; body?: string | null
    activity_date: string; created_by_name?: string | null
  }

  const contactForm = useForm<ContactForm>({ resolver: zodResolver(contactSchema) })
  const activityForm = useForm<ActivityForm>({ resolver: zodResolver(activitySchema) })

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [clientData, proj, est, act] = await Promise.all([
        api.get<ClientDetail>(`/clients/${id}`),
        api.get<Project[]>(`/clients/${id}/projects`),
        api.get<Estimate[]>(`/clients/${id}/estimates`),
        api.get<ActivityRow[]>(`/clients/${id}/activities`),
      ])
      setClient(clientData); setProjects(proj); setEstimates(est); setActivities(act)
    } catch { toast({ title: 'Failed to load client', variant: 'destructive' }) }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const saveContact = async (data: ContactForm) => {
    if (!id) return
    try {
      if (contactDialog.editing) {
        await api.put(`/clients/${id}/contacts/${contactDialog.editing.id}`, data)
        toast({ title: 'Contact updated' })
      } else {
        await api.post(`/clients/${id}/contacts`, data)
        toast({ title: 'Contact added' })
      }
      setContactDialog({ open: false })
      contactForm.reset()
      load()
    } catch (e) { toast({ title: 'Error', description: String(e), variant: 'destructive' }) }
  }

  const handleDeleteContact = async () => {
    if (!id || !deleteContact) return
    await api.delete(`/clients/${id}/contacts/${deleteContact}`)
    toast({ title: 'Contact removed' })
    setDeleteContact(null)
    load()
  }

  const logActivity = async (data: ActivityForm) => {
    if (!id) return
    try {
      await api.post(`/clients/${id}/activities`, data)
      toast({ title: 'Activity logged' })
      setActivityDialog(false)
      activityForm.reset()
      load()
    } catch (e) { toast({ title: 'Error', description: String(e), variant: 'destructive' }) }
  }

  const openEditContact = (c: Contact) => {
    contactForm.reset({
      first_name: c.first_name,
      last_name: c.last_name,
      title: c.title ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      mobile: c.mobile ?? '',
      notes: c.notes ?? '',
      is_primary: !!c.is_primary,
    })
    setContactDialog({ open: true, editing: c })
  }

  if (loading) return <div className="p-6"><div className="h-64 bg-muted rounded animate-pulse" /></div>
  if (!client) return <div className="p-6 text-muted-foreground">Client not found.</div>

  return (
    <div className="p-6">
      <PageHeader
        title={client.company_name}
        subtitle={`${client.status} · ${client.industry ?? 'General'}`}
        actions={
          <Link to="/clients">
            <Button variant="outline" size="sm">← All Clients</Button>
          </Link>
        }
      />

      {/* Meta row */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
        {client.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{client.city}, {client.state}</span>}
        {client.website && <a href={client.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary"><Globe className="h-3.5 w-3.5" />{client.website}</a>}
      </div>

      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts ({client.contacts?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="activity">Activity ({activities.length})</TabsTrigger>
          <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
          <TabsTrigger value="estimates">Estimates ({estimates.length})</TabsTrigger>
        </TabsList>

        {/* CONTACTS */}
        <TabsContent value="contacts" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Contacts</h3>
            <Button size="sm" onClick={() => { contactForm.reset(); setContactDialog({ open: true }) }}>
              <Plus className="h-4 w-4" /> Add Contact
            </Button>
          </div>
          {client.contacts?.length === 0 ? (
            <EmptyState icon={Plus} title="No contacts" description="Add contacts for this client." />
          ) : (
            <div className="grid gap-3">
              {client.contacts?.map(c => (
                <Card key={c.id}>
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.first_name} {c.last_name}</span>
                        {c.is_primary ? <span title="Primary"><Star className="h-3 w-3 text-amber-400 fill-amber-400" /></span> : null}
                      </div>
                      {c.title && <p className="text-sm text-muted-foreground">{c.title}</p>}
                      <div className="flex flex-wrap gap-3 mt-1 text-sm">
                        {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-primary hover:underline"><Mail className="h-3.5 w-3.5" />{c.email}</a>}
                        {c.phone && <span className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{c.phone}</span>}
                        {c.mobile && <span className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{c.mobile} (m)</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditContact(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteContact(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ACTIVITY */}
        <TabsContent value="activity" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Activity Log</h3>
            <Button size="sm" onClick={() => setActivityDialog(true)}>
              <Plus className="h-4 w-4" /> Log Activity
            </Button>
          </div>
          {activities.length === 0 ? (
            <EmptyState icon={Plus} title="No activity yet" description="Log calls, emails, meetings, and notes." />
          ) : (
            <div className="space-y-3">
              {activities.map(a => (
                <div key={a.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={a.activity_type} />
                      <span className="font-medium text-sm">{a.subject}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDateTime(a.activity_date)}</span>
                  </div>
                  {a.body && <p className="text-sm text-muted-foreground mt-1">{a.body}</p>}
                  {a.created_by_name && <p className="text-xs text-muted-foreground mt-1">— {a.created_by_name}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PROJECTS */}
        <TabsContent value="projects" className="mt-4">
          {projects.length === 0 ? (
            <EmptyState icon={Plus} title="No projects" description="Projects linked to this client will appear here." />
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 font-medium text-muted-foreground">Number</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Value</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Start</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {projects.map(p => (
                  <tr key={p.id}>
                    <td className="py-2.5"><Link to={`/projects/${p.id}`} className="text-primary hover:underline font-mono text-xs">{p.project_number}</Link></td>
                    <td className="py-2.5"><Link to={`/projects/${p.id}`} className="font-medium hover:text-primary">{p.name}</Link></td>
                    <td className="py-2.5"><StatusBadge status={p.status} colorMap={PROJECT_STATUS_COLORS} /></td>
                    <td className="py-2.5">{formatCurrency(p.contract_value)}</td>
                    <td className="py-2.5 text-muted-foreground">{formatDate(p.start_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TabsContent>

        {/* ESTIMATES */}
        <TabsContent value="estimates" className="mt-4">
          {estimates.length === 0 ? (
            <EmptyState icon={Plus} title="No estimates" description="Estimates for this client will appear here." />
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 font-medium text-muted-foreground">Number</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Title</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {estimates.map(e => (
                  <tr key={e.id}>
                    <td className="py-2.5"><Link to={`/estimates/${e.id}`} className="text-primary hover:underline font-mono text-xs">{e.estimate_number}</Link></td>
                    <td className="py-2.5"><Link to={`/estimates/${e.id}`} className="font-medium hover:text-primary">{e.title}</Link></td>
                    <td className="py-2.5"><StatusBadge status={e.status} colorMap={ESTIMATE_STATUS_COLORS} /></td>
                    <td className="py-2.5 text-right font-medium">{formatCurrency(e.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TabsContent>
      </Tabs>

      {/* Contact dialog */}
      <Dialog open={contactDialog.open} onOpenChange={o => setContactDialog({ open: o })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{contactDialog.editing ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={contactForm.handleSubmit(saveContact)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input {...contactForm.register('first_name')} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input {...contactForm.register('last_name')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input {...contactForm.register('title')} placeholder="e.g. VP of Real Estate" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" {...contactForm.register('email')} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input {...contactForm.register('phone')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input {...contactForm.register('mobile')} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea {...contactForm.register('notes')} rows={2} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...contactForm.register('is_primary')} className="rounded" />
              Primary contact
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setContactDialog({ open: false })}>Cancel</Button>
              <Button type="submit" disabled={contactForm.formState.isSubmitting}>
                {contactForm.formState.isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Activity dialog */}
      <Dialog open={activityDialog} onOpenChange={setActivityDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
          <form onSubmit={activityForm.handleSubmit(logActivity)} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select onValueChange={v => activityForm.setValue('activity_type', v as ActivityForm['activity_type'])}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Input {...activityForm.register('subject')} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea {...activityForm.register('body')} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setActivityDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={activityForm.formState.isSubmitting}>Log</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteContact}
        onOpenChange={o => !o && setDeleteContact(null)}
        title="Remove contact?"
        description="This cannot be undone."
        confirmLabel="Remove"
        onConfirm={handleDeleteContact}
      />
    </div>
  )
}
