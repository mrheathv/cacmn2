import { formatCurrency, formatDate } from '@/lib/utils'
import type { Estimate, EstimateLineItem } from '@/types'

interface EstimatePreviewProps {
  estimate: Estimate
}

export function EstimatePreview({ estimate }: EstimatePreviewProps) {
  const sections = estimate.sections ?? []
  const lineItems = estimate.line_items ?? []

  const unsectioned = lineItems.filter(i => i.section_id == null)

  return (
    <div className="bg-white text-sm font-sans p-8 max-w-3xl mx-auto print:p-0 print:max-w-none">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">CONSTRUCT-ALL CORPORATION</div>
          <div className="text-muted-foreground text-xs mt-1">Minneapolis, MN · cacmn.com</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold text-amber-600">ESTIMATE</div>
          <div className="text-xs text-muted-foreground mt-1">{estimate.estimate_number}</div>
          {estimate.valid_until && (
            <div className="text-xs text-muted-foreground">Valid until {formatDate(estimate.valid_until)}</div>
          )}
        </div>
      </div>

      {/* To / From */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">To</div>
          <div className="font-semibold">{estimate.company_name ?? '—'}</div>
          {estimate.contact_name && <div className="text-muted-foreground">{estimate.contact_name}</div>}
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Project</div>
          <div className="font-semibold">{estimate.title}</div>
          {estimate.description && <div className="text-muted-foreground text-xs mt-1">{estimate.description}</div>}
        </div>
      </div>

      {/* Line Items Table */}
      <table className="w-full border-collapse mb-6 text-sm">
        <thead>
          <tr className="bg-slate-800 text-white text-xs">
            <th className="text-left px-3 py-2 font-medium">Description</th>
            <th className="text-right px-3 py-2 font-medium w-16">Qty</th>
            <th className="text-left px-3 py-2 font-medium w-12">Unit</th>
            <th className="text-right px-3 py-2 font-medium w-24">Unit Cost</th>
            <th className="text-right px-3 py-2 font-medium w-24">Total</th>
          </tr>
        </thead>
        <tbody>
          {/* Unsectioned */}
          {unsectioned.map(item => (
            <ItemRow key={item.id} item={item} />
          ))}

          {/* Sections */}
          {sections.map(section => {
            const items = lineItems.filter(i => i.section_id === section.id)
            const sectionTotal = items.reduce((s, i) => s + i.total_cost, 0)
            return (
              <>
                <tr key={`s-${section.id}`} className="bg-slate-100">
                  <td colSpan={4} className="px-3 py-1.5 font-semibold text-xs uppercase tracking-wide text-slate-700">
                    {section.name}
                  </td>
                  <td className="px-3 py-1.5 text-right font-semibold text-xs text-slate-700">
                    {formatCurrency(sectionTotal)}
                  </td>
                </tr>
                {items.map(item => (
                  <ItemRow key={item.id} item={item} indent />
                ))}
              </>
            )
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64 space-y-1">
          <div className="flex justify-between text-sm py-1">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(estimate.subtotal)}</span>
          </div>
          {estimate.markup_pct > 0 && (
            <div className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">Markup ({estimate.markup_pct}%)</span>
              <span>{formatCurrency(estimate.markup_amount)}</span>
            </div>
          )}
          {estimate.tax_pct > 0 && (
            <div className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">Tax ({estimate.tax_pct}%)</span>
              <span>{formatCurrency(estimate.tax_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base py-2 border-t border-slate-800">
            <span>TOTAL</span>
            <span className="text-amber-600">{formatCurrency(estimate.total)}</span>
          </div>
        </div>
      </div>

      {/* Client Notes */}
      {estimate.client_notes && (
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</div>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">{estimate.client_notes}</div>
        </div>
      )}

      {/* Terms */}
      {estimate.terms && (
        <div className="border-t pt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Terms & Conditions</div>
          <div className="text-xs text-muted-foreground whitespace-pre-wrap">{estimate.terms}</div>
        </div>
      )}

      {/* Signature block */}
      <div className="mt-12 grid grid-cols-2 gap-12 print:mt-16">
        <div>
          <div className="border-b border-slate-400 mb-1 pb-8" />
          <div className="text-xs text-muted-foreground">Authorized — Construct-All Corporation</div>
          <div className="text-xs text-muted-foreground mt-0.5">Date</div>
        </div>
        <div>
          <div className="border-b border-slate-400 mb-1 pb-8" />
          <div className="text-xs text-muted-foreground">Client Acceptance</div>
          <div className="text-xs text-muted-foreground mt-0.5">Date</div>
        </div>
      </div>
    </div>
  )
}

function ItemRow({ item, indent }: { item: EstimateLineItem; indent?: boolean }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50">
      <td className={`px-3 py-2 ${indent ? 'pl-6' : ''}`}>{item.description}</td>
      <td className="px-3 py-2 text-right text-muted-foreground">{item.quantity}</td>
      <td className="px-3 py-2 text-muted-foreground">{item.unit}</td>
      <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(item.unit_cost)}</td>
      <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total_cost)}</td>
    </tr>
  )
}
