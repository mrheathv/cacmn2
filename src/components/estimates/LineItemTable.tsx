import { useState } from 'react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import type { EstimateSection, EstimateLineItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react'

const UNITS = ['LS', 'SF', 'LF', 'EA', 'HR', 'CY', 'TN', 'GAL', 'SQ']
const CATEGORIES = ['labor', 'material', 'equipment', 'subcontractor', 'other']
const CATEGORY_COLORS: Record<string, string> = {
  labor: 'text-blue-600',
  material: 'text-green-600',
  equipment: 'text-orange-600',
  subcontractor: 'text-purple-600',
  other: 'text-gray-400',
}

interface LineItemTableProps {
  estimateId: number
  sections: EstimateSection[]
  lineItems: EstimateLineItem[]
  onChange: () => void
}

export function LineItemTable({ estimateId, sections, lineItems, onChange }: LineItemTableProps) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const [newSectionName, setNewSectionName] = useState('')
  const [addingSection, setAddingSection] = useState(false)

  const itemsForSection = (sectionId: number | null) =>
    lineItems.filter(i => (sectionId === null ? i.section_id == null : i.section_id === sectionId))

  const addSection = async () => {
    if (!newSectionName.trim()) return
    await api.post(`/estimates/${estimateId}/sections`, { name: newSectionName.trim(), sort_order: sections.length })
    setNewSectionName('')
    setAddingSection(false)
    onChange()
  }

  const deleteSection = async (id: number) => {
    await api.delete(`/estimates/${estimateId}/sections/${id}`)
    onChange()
  }

  const addLineItem = async (sectionId: number | null) => {
    await api.post(`/estimates/${estimateId}/line-items`, {
      section_id: sectionId,
      description: 'New item',
      quantity: 1,
      unit: 'LS',
      unit_cost: 0,
      category: 'other',
      sort_order: itemsForSection(sectionId).length,
    })
    onChange()
  }

  const updateItem = async (item: EstimateLineItem, field: keyof EstimateLineItem, value: unknown) => {
    const updated = { ...item, [field]: value }
    if (field === 'quantity' || field === 'unit_cost') {
      updated.total_cost = (updated.quantity as number) * (updated.unit_cost as number)
    }
    await api.put(`/estimates/${estimateId}/line-items/${item.id}`, { [field]: value })
    onChange()
  }

  const deleteItem = async (id: number) => {
    await api.delete(`/estimates/${estimateId}/line-items/${id}`)
    onChange()
  }

  const toggleCollapse = (id: number) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const renderItems = (sectionId: number | null) => {
    const items = itemsForSection(sectionId)
    return (
      <>
        {items.map(item => (
          <LineItemRow
            key={item.id}
            item={item}
            onUpdate={(field, value) => updateItem(item, field, value)}
            onDelete={() => deleteItem(item.id)}
          />
        ))}
        <tr>
          <td colSpan={7} className="px-2 py-1">
            <button
              onClick={() => addLineItem(sectionId)}
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors"
            >
              <Plus className="h-3 w-3" /> Add line item
            </button>
          </td>
        </tr>
      </>
    )
  }

  return (
    <div className="text-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="w-6" />
            <th className="text-left py-2 px-2 font-medium">Description</th>
            <th className="text-right py-2 px-2 font-medium w-16">Qty</th>
            <th className="text-left py-2 px-2 font-medium w-16">Unit</th>
            <th className="text-right py-2 px-2 font-medium w-24">Unit Cost</th>
            <th className="text-right py-2 px-2 font-medium w-24">Total</th>
            <th className="text-left py-2 px-2 font-medium w-28">Category</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {/* Unsectioned items */}
          {itemsForSection(null).length > 0 && renderItems(null)}

          {/* Sections */}
          {sections.map(section => (
            <>
              <tr key={`section-${section.id}`} className="bg-muted/40">
                <td className="px-1 py-2">
                  <button onClick={() => toggleCollapse(section.id)} className="text-muted-foreground hover:text-foreground">
                    {collapsed.has(section.id) ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </td>
                <td colSpan={6} className="py-2 px-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                  {section.name}
                  <span className="ml-2 font-normal normal-case">
                    {formatCurrency(itemsForSection(section.id).reduce((s, i) => s + i.total_cost, 0))}
                  </span>
                </td>
                <td className="py-2 px-1">
                  <button onClick={() => deleteSection(section.id)} className="text-muted-foreground/40 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
              {!collapsed.has(section.id) && renderItems(section.id)}
            </>
          ))}
        </tbody>
      </table>

      {/* Add section */}
      <div className="border-t pt-3 mt-1 px-2 flex items-center gap-2">
        {addingSection ? (
          <>
            <Input
              value={newSectionName}
              onChange={e => setNewSectionName(e.target.value)}
              placeholder="Section name, e.g. Division 09 — Finishes"
              className="h-8 text-xs max-w-xs"
              onKeyDown={e => { if (e.key === 'Enter') addSection(); if (e.key === 'Escape') setAddingSection(false) }}
              autoFocus
            />
            <Button size="sm" className="h-8" onClick={addSection}>Add</Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setAddingSection(false)}>Cancel</Button>
          </>
        ) : (
          <button onClick={() => setAddingSection(true)} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 py-1">
            <Plus className="h-3 w-3" /> Add section
          </button>
        )}
      </div>
    </div>
  )
}

function LineItemRow({ item, onUpdate, onDelete }: {
  item: EstimateLineItem
  onUpdate: (field: keyof EstimateLineItem, value: unknown) => void
  onDelete: () => void
}) {
  const [desc, setDesc] = useState(item.description)
  const [qty, setQty] = useState(String(item.quantity))
  const [uc, setUc] = useState(String(item.unit_cost))

  const commit = (field: keyof EstimateLineItem, value: unknown) => onUpdate(field, value)

  return (
    <tr className="border-b border-muted/60 hover:bg-muted/10 group">
      <td className="px-1 py-1.5 text-muted-foreground/30 group-hover:text-muted-foreground/60">
        <GripVertical className="h-3.5 w-3.5" />
      </td>
      <td className="px-2 py-1.5">
        <input
          value={desc}
          onChange={e => setDesc(e.target.value)}
          onBlur={() => desc !== item.description && commit('description', desc)}
          className="w-full bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-ring rounded px-1 text-sm"
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          type="number"
          value={qty}
          onChange={e => setQty(e.target.value)}
          onBlur={() => { const n = parseFloat(qty); if (!isNaN(n) && n !== item.quantity) commit('quantity', n) }}
          className="w-14 text-right bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-ring rounded px-1 text-sm"
        />
      </td>
      <td className="px-2 py-1.5">
        <Select defaultValue={item.unit} onValueChange={v => commit('unit', v)}>
          <SelectTrigger className="h-7 w-16 text-xs border-0 bg-transparent focus:bg-white focus:ring-1 px-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
      <td className="px-2 py-1.5">
        <input
          type="number"
          value={uc}
          onChange={e => setUc(e.target.value)}
          onBlur={() => { const n = parseFloat(uc); if (!isNaN(n) && n !== item.unit_cost) commit('unit_cost', n) }}
          className="w-24 text-right bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-ring rounded px-1 text-sm"
        />
      </td>
      <td className="px-2 py-1.5 text-right font-medium text-sm">
        {formatCurrency(item.quantity * (parseFloat(uc) || 0))}
      </td>
      <td className="px-2 py-1.5">
        <Select defaultValue={item.category} onValueChange={v => commit('category', v)}>
          <SelectTrigger className={`h-7 w-28 text-xs border-0 bg-transparent focus:bg-white focus:ring-1 px-1 ${CATEGORY_COLORS[item.category]}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c} value={c} className={CATEGORY_COLORS[c]}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
      <td className="px-1 py-1.5">
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}
