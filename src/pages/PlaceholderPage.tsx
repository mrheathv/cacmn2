import { Construction } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'

interface PlaceholderPageProps {
  title: string
  phase: number
}

export function PlaceholderPage({ title, phase }: PlaceholderPageProps) {
  return (
    <div className="p-6">
      <PageHeader title={title} />
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <Construction className="h-8 w-8 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold">Coming in Phase {phase}</h3>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          This module is planned for a future session. The API routes and database schema are already in place.
        </p>
      </div>
    </div>
  )
}
