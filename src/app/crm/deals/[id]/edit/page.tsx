import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDeal } from '@/lib/crm/deals'
import { listPipelines, getPipeline } from '@/lib/crm/pipelines'
import { DealForm } from '@/components/deals/DealForm'

export default async function EditDealPage({ params }: { params: { id: string } }) {
  const deal = await getDeal(params.id)
  if (!deal) notFound()

  const { data: pipelines } = await listPipelines()
  if (!pipelines || pipelines.length === 0) notFound()

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
        <h1 className="text-xl font-semibold text-cream">Editar deal</h1>
        <Link href={`/crm/deals/${params.id}`} className="text-sm text-cream/60 hover:text-gold">
          ← Voltar
        </Link>
      </div>
      <DealForm
        deal={{
          id: (deal as any).id,
          title: (deal as any).title,
          value: (deal as any).value,
          currency: (deal as any).currency,
          pipeline_id: (deal as any).pipeline_id,
          stage_id: (deal as any).stage_id,
          contact_id: (deal as any).contact_id,
          company_id: (deal as any).company_id,
          owner_id: (deal as any).owner_id,
          expected_close_date: (deal as any).expected_close_date,
          tags: (deal as any).tags ?? [],
        }}
        pipelines={pipelines.map((p) => ({ id: p.id, name: p.name }))}
        stagesByPipeline={stagesByPipeline}
      />
    </div>
  )
}
