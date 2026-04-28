import Link from 'next/link'
import { redirect } from 'next/navigation'
import { listPipelines, getPipeline } from '@/lib/crm/pipelines'
import { DealForm } from '@/components/deals/DealForm'

type SearchParams = { pipeline?: string }

export default async function NewDealPage({ searchParams }: { searchParams: SearchParams }) {
  const { data: pipelines } = await listPipelines()
  if (!pipelines || pipelines.length === 0) {
    redirect('/crm/settings/pipelines')
  }

  const defaultPipelineId =
    (searchParams.pipeline && pipelines.some((p) => p.id === searchParams.pipeline)
      ? searchParams.pipeline
      : pipelines.find((p) => p.is_default)?.id) ?? pipelines[0].id

  // Carregar stages de cada pipeline (para DealForm trocar dinamicamente)
  const stagesByPipeline: Record<string, any[]> = {}
  for (const p of pipelines) {
    const full = await getPipeline(p.id)
    stagesByPipeline[p.id] = (full?.pipeline_stages ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      stage_type: s.stage_type,
    }))
  }

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-cream">Novo deal</h1>
        <Link href="/crm/pipeline" className="text-sm text-cream/60 hover:text-gold">
          ← Voltar
        </Link>
      </div>
      <DealForm
        pipelines={pipelines.map((p) => ({ id: p.id, name: p.name }))}
        stagesByPipeline={stagesByPipeline}
        defaultPipelineId={defaultPipelineId}
      />
    </div>
  )
}
