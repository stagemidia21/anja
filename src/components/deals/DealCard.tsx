'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlertTriangle, Check, X } from 'lucide-react'
import Link from 'next/link'
import { formatBRL, formatDatePt } from '@/lib/format/brl'
import { isRotten } from '@/lib/crm/rotten'
import type { KanbanDeal } from '@/lib/crm/deals'

type Props = {
  deal: KanbanDeal
  rottenDays: number
  onOutcome: (dealId: string, outcome: 'won' | 'lost') => void
}

export function DealCard({ deal, rottenDays, onOutcome }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { type: 'deal', dealId: deal.id, stageId: deal.stage_id },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const rotten = isRotten(
    { last_activity_at: deal.last_activity_at, created_at: deal.created_at },
    rottenDays,
  )

  const contactName = deal.contact?.full_name ?? null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-char-2 border rounded-lg p-3 text-sm space-y-2 cursor-grab active:cursor-grabbing hover:border-gold/40 transition-colors ${
        rotten ? 'border-amber-500/60 ring-1 ring-amber-500/40' : 'border-char-3'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/crm/deals/${deal.id}`}
          className="text-cream font-medium hover:text-gold line-clamp-2"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {deal.title}
        </Link>
        {rotten && (
          <span
            title={`Parado ha mais de ${rottenDays} dias`}
            className="text-amber-400 shrink-0"
          >
            <AlertTriangle size={14} />
          </span>
        )}
      </div>

      <div className="text-gold font-semibold">{formatBRL(deal.value)}</div>

      {contactName && (
        <div className="text-cream/60 text-xs truncate">{contactName}</div>
      )}

      {deal.expected_close_date && (
        <div className="text-cream/50 text-xs">
          Prev.: {formatDatePt(deal.expected_close_date)}
        </div>
      )}

      <div className="flex gap-2 pt-1 border-t border-char-3">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onOutcome(deal.id, 'won')
          }}
          className="flex-1 text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center gap-1"
        >
          <Check size={12} /> Ganhar
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onOutcome(deal.id, 'lost')
          }}
          className="flex-1 text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center gap-1"
        >
          <X size={12} /> Perder
        </button>
      </div>
    </div>
  )
}
