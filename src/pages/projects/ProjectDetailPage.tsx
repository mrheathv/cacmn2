import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Project, Milestone, Task, Document, Client, User } from '@/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { FileUpload, FileList } from '@/components/shared/FileUpload'
import { MilestoneList } from '@/components/projects/MilestoneList'
import { TaskList } from '@/components/projects/TaskList'
import { ProjectTimeline } from '@/components/projects/ProjectTimeline'
import { ProjectForm, type ProjectFormData } from '@/components/projects/ProjectForm'
import { toast } from '@/hooks/useToast'
import { formatCurrency, formatDate, PROJECT_STATUS_COLORS } from '@/lib/utils'
import { Pencil, MapPin, Calendar, DollarSign, Users, HardHat } from 'lucide-react'

interface ProjectDetail extends Project {
  milestones: Milestone[]
  task_counts: { status: string; cnt: number }[]
}

interface SubAssignment {
  id: number
  subcontractor_id: number
  company_name: string
  trade: string
  contact_name?: string | null
  contact_phone?: string | null
  trade_package?: string | null
  contract_amount?: number | null
  status: string
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [subs, setSubs] = useState<SubAssignment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadProject = useCallback(async () => {
    if (!id) return
    const [proj, taskData, docData, subData] = await Promise.all([
      api.get<ProjectDetail>(`/projects/${id}`),
      api.get<Task[]>(`/projects/${id}/tasks`),
      api.get<Document[]>(`/projects/${id}/documents`),
      api.get<SubAssignment[]>(`/projects/${id}/subcontractors`),
    ])
    setProject(proj)
    setTasks(taskData)
    setDocuments(docData)
    setSubs(subData)
    setLoading(false)
  }, [id])

  useEffect(() => { loadProject() }, [loadProject])

  useEffect(() => {
    Promise.all([
      api.get<Client[]>('/clients'),
      api.get<User[]>('/users').catch(() => [] as User[]),
    ]).then(([c, u]) => { setClients(c); setUsers(u) })
  }, [])

  const handleEdit = async (data: ProjectFormData) => {
    await api.put(`/projects/${id}`, data)
    toast({ title: 'Project updated' })
    setEditOpen(false)
    loadProject()
  }

  if (loading) return <div className="p-6"><div className="h-96 bg-muted rounded animate-pulse" /></div>
  if (!project) return <div className="p-6 text-muted-foreground">Project not found.</div>

  const taskDone = project.task_counts.find(t => t.status === 'done')?.cnt ?? 0
  const taskTotal = project.task_counts.reduce((s, t) => s + t.cnt, 0)

  return (
    <div className="p-6">
      <PageHeader
        title={project.name}
        subtitle={
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{project.project_number}</span>
            <StatusBadge status={project.status} colorMap={PROJECT_STATUS_COLORS} />
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Link to="/projects"><Button variant="outline" size="sm">← Projects</Button></Link>
            <Button size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>
          </div>
        }
      />

      {/* Meta strip */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
        {project.company_name && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{project.company_name}</span>}
        {(project.city || project.address) && (
          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{project.address ? `${project.address}, ` : ''}{project.city}, {project.state}</span>
        )}
        {project.contract_value && <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{formatCurrency(project.contract_value)}</span>}
        {project.start_date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(project.start_date)} → {formatDate(project.end_date)}</span>}
        {project.pm_name && <span className="flex items-center gap-1"><HardHat className="h-3.5 w-3.5" />PM: {project.pm_name}</span>}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">Milestones ({project.milestones?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({taskTotal})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="subs">Subcontractors ({subs.length})</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Task progress */}
              {taskTotal > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Task Progress</span>
                      <span className="text-muted-foreground">{taskDone} / {taskTotal} done</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${taskTotal > 0 ? (taskDone / taskTotal) * 100 : 0}%` }} />
                    </div>
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      {project.task_counts.map(tc => (
                        <span key={tc.status}>{tc.cnt} {tc.status.replace('_', ' ')}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Timeline */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Milestone Timeline</CardTitle></CardHeader>
                <CardContent className="px-4 pb-4">
                  <ProjectTimeline milestones={project.milestones ?? []} projectStart={project.start_date} projectEnd={project.end_date} />
                </CardContent>
              </Card>

              {/* Description */}
              {project.description && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Description</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</CardContent>
                </Card>
              )}
            </div>

            {/* Right sidebar details */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Project Details</CardTitle></CardHeader>
                <CardContent className="px-4 pb-4 space-y-2 text-sm">
                  <Row label="Type" value={project.project_type.replace('_', ' ')} />
                  <Row label="Contract" value={project.contract_type?.replace('_', ' ')} />
                  <Row label="Value" value={formatCurrency(project.contract_value)} />
                  <Row label="Start" value={formatDate(project.start_date)} />
                  <Row label="Target End" value={formatDate(project.end_date)} />
                  {project.actual_end_date && <Row label="Actual End" value={formatDate(project.actual_end_date)} />}
                  <Row label="PM" value={project.pm_name} />
                  <Row label="Super" value={project.super_name} />
                </CardContent>
              </Card>
              {project.notes && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
                  <CardContent className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-wrap">{project.notes}</CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* MILESTONES */}
        <TabsContent value="milestones">
          <MilestoneList
            projectId={project.id}
            milestones={project.milestones ?? []}
            onChange={loadProject}
          />
        </TabsContent>

        {/* TASKS */}
        <TabsContent value="tasks">
          <TaskList
            projectId={project.id}
            tasks={tasks}
            milestones={project.milestones ?? []}
            users={users}
            onChange={loadProject}
          />
        </TabsContent>

        {/* DOCUMENTS */}
        <TabsContent value="documents">
          <div className="max-w-2xl space-y-4">
            <FileUpload
              entityType="project"
              entityId={project.id}
              onUploaded={doc => setDocuments(prev => [doc, ...prev])}
            />
            <FileList
              documents={documents}
              onDeleted={docId => setDocuments(prev => prev.filter(d => d.id !== docId))}
            />
          </div>
        </TabsContent>

        {/* SUBCONTRACTORS */}
        <TabsContent value="subs">
          {subs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No subcontractors assigned yet. Award bids on the Subcontractors page to link them here.</div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trade</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Package</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Contract</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subs.map(s => (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3"><Link to={`/subcontractors/${s.subcontractor_id}`} className="font-medium hover:text-primary">{s.company_name}</Link></td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{s.trade.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.trade_package ?? '—'}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(s.contract_amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.contact_name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ProjectForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleEdit}
        clients={clients}
        users={users}
        initialValues={project}
        title="Edit Project"
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <span className="font-medium text-right capitalize">{value ?? '—'}</span>
    </div>
  )
}
