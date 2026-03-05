import { useState } from 'react'
import { CheckCircle2, Circle, Briefcase } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileUpload, FileList } from '@/components/shared/FileUpload'
import { api } from '@/lib/api'
import { toast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import type { Subcontractor, Document } from '@/types'

// ---------------------------------------------------------------------------
// Flag definitions
// ---------------------------------------------------------------------------

const OPERATIONAL_FLAGS = [
  {
    key: 'provides_own_tools' as const,
    label: 'Provides Own Tools',
    description: 'The subcontractor supplies their own hand tools and equipment for the job.',
  },
  {
    key: 'provides_own_materials' as const,
    label: 'Provides Own Materials',
    description: 'The subcontractor purchases and supplies their own materials.',
  },
  {
    key: 'provides_own_equipment' as const,
    label: 'Provides Own Equipment',
    description: 'The subcontractor owns or leases heavy equipment (trucks, lifts, etc.).',
  },
  {
    key: 'responsible_for_labor' as const,
    label: 'Responsible for Own Labor',
    description: 'The subcontractor manages and is responsible for their own workers.',
  },
  {
    key: 'can_hire_employees' as const,
    label: 'Can Hire Employees',
    description: 'The subcontractor has the ability to hire additional employees or subcontractors.',
  },
  {
    key: 'advertises_to_public' as const,
    label: 'Advertises to the Public',
    description:
      'The subcontractor markets their services to the general public (website, listings, etc.).',
  },
  {
    key: 'has_multiple_clients' as const,
    label: 'Has Multiple Clients',
    description:
      'The subcontractor works for or offers services to multiple customers, not just this contractor.',
  },
  {
    key: 'maintains_separate_location' as const,
    label: 'Maintains Separate Business Location',
    description:
      'The subcontractor maintains a business address separate from the hiring contractor.',
  },
  {
    key: 'can_realize_profit_loss' as const,
    label: 'Can Realize Profit or Loss',
    description:
      'The subcontractor can make a profit or suffer a financial loss depending on how they manage costs.',
  },
] as const

type OperationalFlagKey = (typeof OPERATIONAL_FLAGS)[number]['key']

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  sub: Subcontractor
  onUpdated: (updated: Subcontractor) => void
  documents: Document[]
  onDocumentsChange: (docs: Document[]) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OperationalSection({ sub, onUpdated, documents, onDocumentsChange }: Props) {
  const [saving, setSaving] = useState<OperationalFlagKey | null>(null)

  const confirmedCount = OPERATIONAL_FLAGS.filter((f) => sub[f.key] === 1).length

  async function handleToggle(key: OperationalFlagKey, currentValue: number) {
    const newValue = currentValue === 1 ? 0 : 1
    setSaving(key)
    try {
      const updated = await api.put<Subcontractor>(`/subcontractors/${sub.id}`, {
        [key]: newValue,
      })
      onUpdated(updated)
    } catch {
      toast({
        title: 'Save failed',
        description: 'Could not update the operational flag.',
        variant: 'destructive',
      })
    } finally {
      setSaving(null)
    }
  }

  function handleUploaded(doc: Document) {
    onDocumentsChange([...documents, doc])
  }

  function handleDeleted(id: number) {
    onDocumentsChange(documents.filter((d) => d.id !== id))
  }

  const evidenceDocs = documents.filter((d) => d.compliance_criterion === null || d.compliance_criterion === undefined)

  return (
    <div className="space-y-5">
      {/* Header summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Operational Independence
            </CardTitle>
            <Badge
              variant={confirmedCount === 9 ? 'default' : confirmedCount >= 6 ? 'secondary' : 'destructive'}
              className="text-sm px-3 py-0.5"
            >
              {confirmedCount} of 9 factors confirmed
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            These factors indicate whether this subcontractor operates independently under Minnesota
            §181.723.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {OPERATIONAL_FLAGS.map((flag) => {
              const isYes = sub[flag.key] === 1
              const isSaving = saving === flag.key
              return (
                <div
                  key={flag.key}
                  className={cn(
                    'rounded-lg border-2 p-4 flex flex-col gap-3 transition-colors',
                    isYes ? 'border-green-400 bg-green-50' : 'border-border bg-card',
                    isSaving && 'opacity-60 pointer-events-none',
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-start gap-2 mb-1">
                      {isYes ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      )}
                      <p className="text-sm font-semibold leading-snug">{flag.label}</p>
                    </div>
                    <p className="text-xs text-muted-foreground pl-6">{flag.description}</p>
                  </div>

                  {/* Yes / No toggle pair */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => !isYes && handleToggle(flag.key, sub[flag.key])}
                      disabled={isSaving}
                      className={cn(
                        'flex-1 rounded-md px-3 py-1.5 text-sm font-medium border transition-colors',
                        isYes
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-background text-muted-foreground border-border hover:border-green-400 hover:text-green-700',
                      )}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => isYes && handleToggle(flag.key, sub[flag.key])}
                      disabled={isSaving}
                      className={cn(
                        'flex-1 rounded-md px-3 py-1.5 text-sm font-medium border transition-colors',
                        !isYes
                          ? 'bg-muted text-foreground border-border'
                          : 'bg-background text-muted-foreground border-border hover:border-slate-400 hover:text-slate-700',
                      )}
                    >
                      No
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Supporting Evidence */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Supporting Evidence</CardTitle>
          <p className="text-xs text-muted-foreground">
            Upload equipment lists, marketing materials, client lists, or other documents that
            support the operational independence factors above.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload
            entityType="subcontractor"
            entityId={sub.id}
            onUploaded={handleUploaded}
          />
          {evidenceDocs.length > 0 && (
            <FileList documents={evidenceDocs} onDeleted={handleDeleted} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
