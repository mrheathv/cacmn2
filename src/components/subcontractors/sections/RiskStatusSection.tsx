import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck, ShieldX, TrendingUp, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { toast } from '@/hooks/useToast'
import { formatDate, cn } from '@/lib/utils'
import type { Subcontractor, SubcontractorLicense, SubcontractorInsurancePolicy } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RISK_LABELS: Record<string, string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
}

type RiskLevel = 'low' | 'medium' | 'high'

function riskBadgeClass(level: string | null | undefined): string {
  if (level === 'low') return 'bg-green-100 text-green-800 border-green-200'
  if (level === 'medium') return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  if (level === 'high') return 'bg-red-100 text-red-800 border-red-200'
  return 'bg-muted text-muted-foreground border-border'
}

function RiskIcon({ level }: { level: string | null | undefined }) {
  if (level === 'low') return <ShieldCheck className="h-5 w-5 text-green-600" />
  if (level === 'medium') return <ShieldAlert className="h-5 w-5 text-yellow-600" />
  if (level === 'high') return <ShieldX className="h-5 w-5 text-red-600" />
  return <ShieldAlert className="h-5 w-5 text-muted-foreground" />
}

function scoreBadgeClass(score: number | null | undefined): string {
  if (score == null) return 'bg-muted text-muted-foreground border-border'
  if (score === 14) return 'bg-green-100 text-green-800 border-green-200'
  if (score >= 10) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  return 'bg-red-100 text-red-800 border-red-200'
}

function isExpiringSoon(dateStr: string | null | undefined, days = 90): boolean {
  if (!dateStr) return false
  const exp = new Date(dateStr)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + days)
  return exp <= cutoff && exp >= new Date()
}

function isExpired(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

const POLICY_TYPE_LABELS: Record<string, string> = {
  general_liability: 'General Liability',
  workers_comp: "Workers' Comp",
  commercial_auto: 'Commercial Auto',
  umbrella: 'Umbrella',
  builders_risk: "Builder's Risk",
  other: 'Other Insurance',
}

const LICENSE_TYPE_LABELS: Record<string, string> = {
  general_contractor: 'General Contractor',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  hvac: 'HVAC',
  dli: 'DLI',
  other: 'License',
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  sub: Subcontractor
  onUpdated: (updated: Subcontractor) => void
  licenses: SubcontractorLicense[]
  policies: SubcontractorInsurancePolicy[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RiskStatusSection({ sub, onUpdated, licenses, policies }: Props) {
  const [savingRisk, setSavingRisk] = useState(false)

  async function handleRiskChange(value: string) {
    const newLevel = (value === '__none__' ? null : value) as RiskLevel | null
    setSavingRisk(true)
    try {
      const updated = await api.put<Subcontractor>(`/subcontractors/${sub.id}`, {
        risk_level: newLevel,
      })
      onUpdated(updated)
    } catch {
      toast({ title: 'Failed to update risk level', variant: 'destructive' })
    } finally {
      setSavingRisk(false)
    }
  }

  // Expiring items: licenses expiring within 90 days or already expired
  const expiringLicenses = licenses.filter(
    (l) => l.expiration_date && (isExpiringSoon(l.expiration_date) || isExpired(l.expiration_date)),
  )
  const expiringPolicies = policies.filter(
    (p) => p.expiration_date && (isExpiringSoon(p.expiration_date) || isExpired(p.expiration_date)),
  )
  const hasExpiring = expiringLicenses.length > 0 || expiringPolicies.length > 0

  // Missing data checks
  const missingItems: string[] = []
  if (!sub.federal_ein) missingItems.push('Federal EIN')
  if (!sub.mn_tax_id) missingItems.push('MN Tax ID')
  if (!sub.w9_on_file) missingItems.push('W-9 on file')
  if (!sub.address) missingItems.push('Business address')
  if (licenses.length === 0) missingItems.push('No licenses on record')
  if (policies.length === 0) missingItems.push('No insurance on record')

  const allComplete = missingItems.length === 0

  // Compliance score
  const score = sub.compliance_score ?? null

  return (
    <div className="space-y-5">
      {/* Risk Level */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RiskIcon level={sub.risk_level} />
            Risk Level
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold',
                riskBadgeClass(sub.risk_level),
              )}
            >
              {sub.risk_level ? RISK_LABELS[sub.risk_level] : 'Not Set'}
            </span>
            <p className="text-xs text-muted-foreground">
              Override the system-assigned risk level if needed.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">Manual Override:</span>
            <Select
              value={sub.risk_level ?? '__none__'}
              onValueChange={handleRiskChange}
              disabled={savingRisk}
            >
              <SelectTrigger className="w-44 h-8 text-sm">
                <SelectValue placeholder="Select risk level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Not Set —</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
              </SelectContent>
            </Select>
            {savingRisk && (
              <span className="text-xs text-muted-foreground">Saving…</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Score */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Compliance Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {score == null ? (
            <p className="text-sm text-muted-foreground">
              Not assessed — open the Compliance Checklist tab to verify criteria.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold',
                    scoreBadgeClass(score),
                  )}
                >
                  {score} / 14
                </span>
                <span className="text-sm text-muted-foreground">
                  {score === 14
                    ? 'Fully Compliant'
                    : score >= 10
                    ? 'Partially Compliant'
                    : 'Non-Compliant'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    score === 14
                      ? 'bg-green-500'
                      : score >= 10
                      ? 'bg-yellow-500'
                      : 'bg-red-500',
                  )}
                  style={{ width: `${(score / 14) * 100}%` }}
                />
              </div>
            </>
          )}
          <p className="text-xs text-muted-foreground">
            Go to the{' '}
            <span className="font-medium text-foreground">Compliance Checklist</span> tab to
            update verified criteria.
          </p>
        </CardContent>
      </Card>

      {/* Expiring Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Expiring Items
            <span className="text-xs text-muted-foreground font-normal">(within 90 days)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasExpiring ? (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              No expiring items
            </div>
          ) : (
            <ul className="space-y-2">
              {expiringPolicies.map((policy) => {
                const expired = isExpired(policy.expiration_date)
                return (
                  <li key={`policy-${policy.id}`} className="flex items-center gap-2 text-sm">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full flex-shrink-0',
                        expired ? 'bg-red-600' : 'bg-yellow-500',
                      )}
                    />
                    <span>
                      {POLICY_TYPE_LABELS[policy.policy_type] ?? policy.policy_type}
                      {' — '}
                      <span className="text-muted-foreground">{policy.carrier}</span>
                      {' — '}
                      <span
                        className={cn(
                          'font-medium',
                          expired ? 'text-red-700' : 'text-yellow-700',
                        )}
                      >
                        {expired ? 'expired' : 'expires'} {formatDate(policy.expiration_date)}
                      </span>
                    </span>
                  </li>
                )
              })}
              {expiringLicenses.map((license) => {
                const expired = isExpired(license.expiration_date)
                return (
                  <li key={`license-${license.id}`} className="flex items-center gap-2 text-sm">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full flex-shrink-0',
                        expired ? 'bg-red-600' : 'bg-yellow-500',
                      )}
                    />
                    <span>
                      {('license_type' in license
                        ? LICENSE_TYPE_LABELS[(license as SubcontractorLicense & { license_type: string }).license_type] ?? 'License'
                        : 'License')}
                      {' — '}
                      <span className="font-mono text-muted-foreground">{license.license_number}</span>
                      {license.expiration_date && (
                        <>
                          {' — '}
                          <span
                            className={cn(
                              'font-medium',
                              expired ? 'text-red-700' : 'text-yellow-700',
                            )}
                          >
                            {expired ? 'expired' : 'expires'} {formatDate(license.expiration_date)}
                          </span>
                        </>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Missing Data Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {allComplete ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            Missing Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allComplete ? (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              All key fields complete
            </div>
          ) : (
            <ul className="space-y-1.5">
              {missingItems.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
