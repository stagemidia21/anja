'use client'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { KanbanBoard } from '@/components/deals/KanbanBoard'
import { DealListTable } from '@/components/deals/DealListTable'
import { DealFilters } from '@/components/deals/DealFilters'
import { PipelineSwitcher } from '@/components/deals/PipelineSwitcher'
import type { KanbanDeal } from '@/lib/crm/deals'

type Stage = { id: string; name: string; position: number; stage_type: 'open' | 'won' | 'lost' }

type Props = {
  organizationId: string
  pipelines: { id: string; name: string; is_default: boolean }[]
  pipeline: { id: string; name: string; rotten_days: number; stages: Stage[] }
  view: 'kanban' | 'list'
  initialDeals: KanbanDeal[]
  listData: any[]
  listCount: number
  page: number
}

export function PipelineView(props: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  function switchView(v: 'kanban' | 'list') {
    const p = new URLSearchParams(params.toString())
    p.set('view', v)
    p.delete('page')
    router.push(`${pathname}?${p.toString()}`)
  }

  const openStages = props.pipeline.stages
    .filter((s) => s.stage_type === 'open')
    .sort((a, b) => a.position - b.position)
  const closedStages = props.pipeline.stages
    .filter((s) => s.stage_type !== 'open')
    .sort((a, b) => a.position - b.position)
  const orderedStages = [...openStages, ...closedStages]

  const createDealHref = `/crm/deals/new?pipeline=${props.pipeline.id}`

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-cream">Pipeline</h1>
          <PipelineSwitcher pipelines={props.pipelines} currentId={props.pipeline.id} />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-char-3 overflow-hidden text-sm">
            <button
              onClick={() => switchView('kanban')}
              className={`px-3 py-1.5 ${props.view === 'kanban' ? 'bg-gold text-charcoal' : 'text-cream/70 hover:text-cream'}`}
            >
              Kanban
            </button>
            <button
              onClick={() => switchView('list')}
              className={`px-3 py-1.5 ${props.view === 'list' ? 'bg-gold text-charcoal' : 'text-cream/70 hover:text-cream'}`}
            >
              Lista
            </button>
          </div>
          <Link
            href={createDealHref}
            className="bg-gold text-charcoal font-semibold px-4 py-2 rounded-lg hover:bg-gold/90 text-sm transition-colors"
          >
            + Novo deal
          </Link>
        </div>
      </div>

      <DealFilters />

      {props.view === 'kanban' ? (
        <KanbanBoard
          organizationId={props.organizationId}
          pipelineId={props.pipeline.id}
          rottenDays={props.pipeline.rotten_days}
          stages={orderedStages}
          initialDeals={props.initialDeals}
        />
      ) : (
        <DealListTable
          rows={props.listData as any}
          count={props.listCount}
          page={props.page}
          perPage={25}
        />
      )}
    </div>
  )
}
