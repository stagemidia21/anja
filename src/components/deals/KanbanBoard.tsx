'use client'
import { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { KanbanColumn } from './KanbanColumn'
import { DealCard } from './DealCard'
import { OutcomeModal } from './OutcomeModal'
import { moveDealStage, listDealsByPipeline } from '@/lib/crm/deals'
import { useOrgDealsChannel } from '@/lib/realtime/useOrgChannel'
import type { KanbanDeal } from '@/lib/crm/deals'

type Stage = {
  id: string
  name: string
  position: number
  stage_type: 'open' | 'won' | 'lost'
}

type Props = {
  organizationId: string
  pipelineId: string
  rottenDays: number
  stages: Stage[]
  initialDeals: KanbanDeal[]
}

export function KanbanBoard({
  organizationId,
  pipelineId,
  rottenDays,
  stages,
  initialDeals,
}: Props) {
  const [deals, setDeals] = useState<KanbanDeal[]>(initialDeals)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [outcomeTarget, setOutcomeTarget] = useState<{
    dealId: string
    outcome: 'won' | 'lost'
  } | null>(null)

  // activationConstraint: distance 6 evita que o click nos botoes Ganhar/Perder
  // dentro do card dispare um drag acidental.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const dealsByStage = useMemo(() => {
    const map = new Map<string, KanbanDeal[]>()
    for (const s of stages) map.set(s.id, [])
    for (const d of deals) {
      const arr = map.get(d.stage_id)
      if (arr) arr.push(d)
    }
    return map
  }, [deals, stages])

  const activeDeal = activeId ? (deals.find((d) => d.id === activeId) ?? null) : null

  const refetchAll = useCallback(async () => {
    const res = await listDealsByPipeline(pipelineId, {})
    if (!res.error && res.data) setDeals(res.data)
  }, [pipelineId])

  // Estrategia simples: refetch completo em qualquer mudanca do pipeline.
  // Volume esperado < 20 eventos/hora por pipeline (accept risk T-03-13).
  useOrgDealsChannel(organizationId, pipelineId, () => {
    refetchAll().catch(() => {})
  })

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id))
  }, [])

  const handleDragEnd = useCallback(
    async (e: DragEndEvent) => {
      setActiveId(null)
      const dealId = String(e.active.id)
      const overData = e.over?.data.current as
        | { type: 'stage' | 'deal'; stageId?: string }
        | undefined
      if (!overData) return

      const targetStageId =
        overData.type === 'stage'
          ? overData.stageId
          : overData.type === 'deal'
            ? overData.stageId
            : undefined
      if (!targetStageId) return

      const deal = deals.find((d) => d.id === dealId)
      if (!deal || deal.stage_id === targetStageId) return

      const prevStageId = deal.stage_id

      // Optimistic update: muda UI antes da server action resolver.
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stage_id: targetStageId } : d)),
      )

      const res = await moveDealStage({ deal_id: dealId, stage_id: targetStageId })
      if ('error' in res && res.error) {
        // Revert em caso de erro.
        setDeals((prev) =>
          prev.map((d) => (d.id === dealId ? { ...d, stage_id: prevStageId } : d)),
        )
        toast.error(`Nao foi possivel mover: ${res.error}`)
      } else {
        toast.success('Deal movido')
      }
    },
    [deals],
  )

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {stages.map((s) => (
            <KanbanColumn
              key={s.id}
              stageId={s.id}
              stageName={s.name}
              stageType={s.stage_type}
              deals={dealsByStage.get(s.id) ?? []}
              rottenDays={rottenDays}
              onOutcome={(dealId, outcome) =>
                setOutcomeTarget({ dealId, outcome })
              }
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal && (
            <DealCard deal={activeDeal} rottenDays={rottenDays} onOutcome={() => {}} />
          )}
        </DragOverlay>
      </DndContext>

      {outcomeTarget && (
        <OutcomeModal
          dealId={outcomeTarget.dealId}
          outcome={outcomeTarget.outcome}
          onClose={() => setOutcomeTarget(null)}
          onDone={() => {
            setOutcomeTarget(null)
            refetchAll().catch(() => {})
          }}
        />
      )}
    </>
  )
}
