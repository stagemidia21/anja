import { listPipelines, getPipeline } from '@/lib/crm/pipelines'
import { PipelineSettingsClient } from './PipelineSettingsClient'

export default async function PipelineSettingsPage() {
  const { data: pipelines } = await listPipelines()
  const pipelinesWithStages = await Promise.all(
    (pipelines ?? []).map(async (p) => {
      const full = await getPipeline(p.id)
      return {
        id: p.id,
        name: p.name,
        is_default: p.is_default,
        rotten_days: p.rotten_days,
        stages: (full?.pipeline_stages ?? []).map((s: any) => ({
          id: s.id,
          name: s.name,
          position: Number(s.position),
          stage_type: s.stage_type as 'open' | 'won' | 'lost',
          default_probability: s.default_probability,
        })),
      }
    }),
  )

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <h1 className="text-xl font-semibold text-cream">Pipelines</h1>
      <p className="text-cream/50 text-sm">
        Configure os pipelines e estagios de cada um. Apenas administradores podem editar.
      </p>
      <PipelineSettingsClient initial={pipelinesWithStages} />
    </div>
  )
}
