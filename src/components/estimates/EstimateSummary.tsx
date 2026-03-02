import { formatCurrency } from '@/lib/utils'
import type { Estimate } from '@/types'

interface EstimateSummaryProps {
  estimate: Estimate
  onMarkupChange?: (pct: number) => void
  onTaxChange?: (pct: number) => void
}

export function EstimateSummary({ estimate }: EstimateSummaryProps) {
  return (
    <div className="space-y-1 text-sm">
      <div className="flex justify-between py-1">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-medium">{formatCurrency(estimate.subtotal)}</span>
      </div>
      {estimate.markup_pct > 0 && (
        <div className="flex justify-between py-1">
          <span className="text-muted-foreground">Markup ({estimate.markup_pct}%)</span>
          <span className="font-medium">{formatCurrency(estimate.markup_amount)}</span>
        </div>
      )}
      {estimate.tax_pct > 0 && (
        <div className="flex justify-between py-1">
          <span className="text-muted-foreground">Tax ({estimate.tax_pct}%)</span>
          <span className="font-medium">{formatCurrency(estimate.tax_amount)}</span>
        </div>
      )}
      <div className="flex justify-between py-2 border-t font-semibold text-base">
        <span>Total</span>
        <span className="text-primary">{formatCurrency(estimate.total)}</span>
      </div>
    </div>
  )
}
