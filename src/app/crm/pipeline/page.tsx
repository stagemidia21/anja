import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireOrg } from '@/lib/auth/require-org'
import { listPipelines, getPipeline } from '@/lib/crm/pipelines'
import { listDealsByPipeline, listDealsTable } from '@/lib/crm/deals'
import { PipelineView } from './PipelineView'

type SearchParams = {
  pipeline?: string
  view?: 'kanban' | 'list'
  page?: string
  sort?: string
  dir?: string
  owner?: string
  tag?: string
  minValue?: string
  maxValue?: string
  fromDate?: string
  toDate?: string
  search?: string
}

export default async function PipelinePage({ searchParams }: { searchParams: SearchParams }) {
  const { organizationId } = await requireOrg()
  const { data: pipelines } = await listPipelines()

  if (!pipelines || pipelines.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-semibold text-cream">Pipeline</h1>
        <p className="text-cream/60 text-sm">
          Nenhum pipeline configurado.{' '}
          <Link href="/crm/settings/pipelines" className="text-gold hover:underline">
            Criar o primeiro
          </Link>
        </p>
      </div>
    )
  }

  const currentId =
    searchParams.pipeline && pipelines.some((p) => p.id === searchParams.pipeline)
      ? searchParams.pipeline
      : pipelines.find((p) => p.is_default)?.id ?? pipelines[0].id

  const pipeline = await getPipeline(currentId)
  if (!pipeline) redirect('/crm/pipeline')

  const filters = {
    ownerId: searchParams.owner || undefined,
    tag: searchParams.tag || undefined,
    minValue: searchParams.minValue ? Number(searchParams.minValue) : undefined,
    maxValue: searchParams.maxValue ? Number(searchParams.maxValue) : undefined,
    fromDate: searchParams.fromDate || undefined,
    toDate: searchParams.toDate || undefined,
    search: searchParams.search || undefined,
  }

  const view = searchParams.view === 'list' ? 'list' : 'kanban'

  let initialDeals: any[] = []
  let listData: any[] = []
  let listCount = 0

  if (view === 'kanban') {
    const r = await listDealsByPipeline(currentId, filters)
    initialDeals = r.data ?? []
  } else {
    const page = Number(searchParams.page ?? 1)
    const r = await listDealsTable(currentId, {
      page,
      perPage: 25,
      sortBy: (searchParams.sort as any) ?? 'created_at',
      sortDir: (searchParams.dir as any) ?? 'desc',
      filters,
    })
    listData = r.data ?? []
    listCount = r.count ?? 0
  }

  return (
    <PipelineView
      organizationId={organizationId}
      pipelines={pipelines}
      pipeline={{
        id: pipeline.id,
        name: pipeline.name,
        rotten_days: pipeline.rotten_days,
        stages: (pipeline.pipeline_stages ?? []).map((s: any) => ({
          id: s.id,
          name: s.name,
          position: Number(s.position),
          stage_type: s.stage_type,
        })),
      }}
      view={view}
      initialDeals={initialDeals}
      listData={listData}
      listCount={listCount}
      page={Number(searchParams.page ?? 1)}
    />
  )
}
