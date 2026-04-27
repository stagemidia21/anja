'use client'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { DealCard } from './DealCard'
import { formatBRL } from '@/lib/format/brl'
import type { KanbanDeal } from '@/lib/crm/deals'

type Props = {
  stageId: string
  stageName: string
  stageType: 'open' | 'won' | 'lost'
  deals: KanbanDeal[]
  rottenDays: number
  onOutcome: (dealId: string, outcome: 'won' | 'lost') => void
}

export function KanbanColumn({
  stageId,
  stageName,
  stageType,
  deals,
  rottenDays,
  onOutcome,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: stageId,
    data: { type: 'stage', stageId },
  })

  const total = deals.reduce((sum, d) => sum + (d.value ?? 0), 0)
  const count = deals.length

  const headerColor =
    stageType === 'won'
      ? 'text-emerald-400'
      : stageType === 'lost'
        ? 'text-red-400'
        : 'text-cream'

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-[280px] shrink-0 bg-char-2/40 rounded-lg border transition-colors ${
        isOver ? 'border-gold' : 'border-char-3'
      }`}
    >
      <div className="p-3 border-b border-char-3 space-y-1">
        <div className={`font-semibold text-sm ${headerColor}`}>{stageName}</div>
        <div className="flex items-center justify-between text-xs text-cream/50">
          <span>
            {count} {count === 1 ? 'deal' : 'deals'}
          </span>
          <span className="text-gold">{formatBRL(total)}</span>
        </div>
      </div>

      <SortableContext
        items={deals.map((d) => d.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="p-2 space-y-2 overflow-y-auto flex-1 min-h-[120px]">
          {deals.length === 0 && (
            <div className="text-cream/30 text-xs text-center py-6">Sem deals</div>
          )}
          {deals.map((d) => (
            <DealCard
              key={d.id}
              deal={d}
              rottenDays={rottenDays}
              onOutcome={onOutcome}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
