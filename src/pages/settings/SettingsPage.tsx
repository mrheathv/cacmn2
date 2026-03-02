import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import type { User } from '@/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { toast } from '@/hooks/useToast'
import { Plus, Users, UserCheck } from 'lucide-react'

const profileSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email(),
  current_password: z.string().optional(),
  new_password: z.string().min(8).optional().or(z.literal('')),
})

const userSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  full_name: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['admin', 'pm', 'estimator', 'staff']),
})

type ProfileForm = z.infer<typeof profileSchema>
type UserForm = z.infer<typeof userSchema>

export function SettingsPage() {
  const { user, isAdmin } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [showUserForm, setShowUserForm] = useState(false)
  const [deactivateId, setDeactivateId] = useState<number | null>(null)

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: user?.full_name ?? '', email: user?.email ?? '' },
  })

  const userForm = useForm<UserForm>({ resolver: zodResolver(userSchema) })

  useEffect(() => {
    if (isAdmin) api.get<User[]>('/users').then(setUsers).catch(console.error)
  }, [isAdmin])

  const saveProfile = async (data: ProfileForm) => {
    try {
      await api.put('/auth/me', {
        full_name: data.full_name,
        email: data.email,
        ...(data.new_password ? { current_password: data.current_password, new_password: data.new_password } : {}),
      })
      toast({ title: 'Profile updated' })
    } catch (e) {
      toast({ title: 'Update failed', description: String(e), variant: 'destructive' })
    }
  }

  const createUser = async (data: UserForm) => {
    try {
      await api.post('/users', data)
      const updated = await api.get<User[]>('/users')
      setUsers(updated)
      setShowUserForm(false)
      userForm.reset()
      toast({ title: 'User created' })
    } catch (e) {
      toast({ title: 'Create failed', description: String(e), variant: 'destructive' })
    }
  }

  const deactivateUser = async () => {
    if (!deactivateId) return
    try {
      await api.delete(`/users/${deactivateId}`)
      setUsers(us => us.map(u => u.id === deactivateId ? { ...u, is_active: 0 as unknown as boolean } : u))
      toast({ title: 'User deactivated' })
    } catch (e) {
      toast({ title: 'Error', description: String(e), variant: 'destructive' })
    }
    setDeactivateId(null)
  }

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-700',
      pm: 'bg-blue-100 text-blue-700',
      estimator: 'bg-purple-100 text-purple-700',
      staff: 'bg-gray-100 text-gray-600',
    }
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[role] ?? ''}`}>{role}</span>
  }

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader title="Settings" />

      {/* Profile */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserCheck className="h-4 w-4" /> My Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4 max-w-sm">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input {...profileForm.register('full_name')} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" {...profileForm.register('email')} />
            </div>
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-3">Change Password</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Current Password</Label>
                  <Input type="password" {...profileForm.register('current_password')} />
                </div>
                <div className="space-y-1.5">
                  <Label>New Password</Label>
                  <Input type="password" {...profileForm.register('new_password')} />
                </div>
              </div>
            </div>
            <Button type="submit" disabled={profileForm.formState.isSubmitting}>
              {profileForm.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* User management (admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Users</CardTitle>
            <Button size="sm" onClick={() => setShowUserForm(true)}>
              <Plus className="h-4 w-4" /> Add User
            </Button>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <EmptyState icon={Users} title="No users yet" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Username</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Role</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="py-2.5">{u.full_name}</td>
                      <td className="py-2.5 text-muted-foreground">{u.username}</td>
                      <td className="py-2.5">{roleBadge(u.role)}</td>
                      <td className="py-2.5">
                        <Badge variant={(u as unknown as { is_active: number }).is_active ? 'default' : 'secondary'}>
                          {(u as unknown as { is_active: number }).is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right">
                        {u.id !== user?.id && (u as unknown as { is_active: number }).is_active ? (
                          <Button size="sm" variant="ghost" className="text-destructive h-7 text-xs" onClick={() => setDeactivateId(u.id)}>
                            Deactivate
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create user dialog */}
      <Dialog open={showUserForm} onOpenChange={setShowUserForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <form onSubmit={userForm.handleSubmit(createUser)} className="space-y-3">
            {(['full_name', 'username', 'email'] as const).map(field => (
              <div key={field} className="space-y-1.5">
                <Label className="capitalize">{field.replace('_', ' ')}</Label>
                <Input {...userForm.register(field)} />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" {...userForm.register('password')} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select onValueChange={v => userForm.setValue('role', v as UserForm['role'])}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {['admin', 'pm', 'estimator', 'staff'].map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={userForm.formState.isSubmitting}>
              {userForm.formState.isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deactivateId}
        onOpenChange={o => !o && setDeactivateId(null)}
        title="Deactivate user?"
        description="This user will no longer be able to sign in."
        confirmLabel="Deactivate"
        onConfirm={deactivateUser}
      />
    </div>
  )
}
