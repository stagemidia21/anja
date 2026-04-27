'use client'
import { useFormState as useActionState } from 'react-dom'
import { useState } from 'react'
import { createDeal, updateDeal } from '@/lib/crm/deals'

type Stage = { id: string; name: string; stage_type: string }
type Pipeline = { id: string; name: string }

type Deal = {
  id: string
  title: string
  value: number | null
  currency: string
  pipeline_id: string
  stage_id: string
  contact_id: string | null
  company_id: string | null
  owner_id: string | null
  expected_close_date: string | null
  tags: string[]
}

type Props = {
  deal?: Deal
  pipelines: Pipeline[]
  stagesByPipeline: Record<string, Stage[]>
  defaultPipelineId?: string
}

type State = { error?: string; success?: boolean } | null

export function DealForm({ deal, pipelines, stagesByPipeline, defaultPipelineId }: Props) {
  const [pipelineId, setPipelineId] = useState(
    deal?.pipeline_id ?? defaultPipelineId ?? pipelines[0]?.id ?? '',
  )

  const action = deal ? updateDeal.bind(null, deal.id) : createDeal
  const [state, formAction, pending] = useActionState<State, FormData>(
    action as any,
    null,
  )

  const stages = stagesByPipeline[pipelineId] ?? []

  return (
    <form action={formAction} className="space-y-5 max-w-lg">
      <div>
        <label className="block text-sm text-cream/70 mb-1">Titulo *</label>
        <input
          name="title"
          defaultValue={deal?.title ?? ''}
          required
          className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-cream/70 mb-1">Valor (BRL)</label>
          <input
            name="value"
            type="number"
            step="0.01"
            min="0"
            defaultValue={deal?.value ?? ''}
            placeholder="0,00"
            className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold"
          />
          <input type="hidden" name="currency" value="BRL" />
        </div>
        <div>
          <label className="block text-sm text-cream/70 mb-1">Data prevista</label>
          <input
            name="expected_close_date"
            type="date"
            defaultValue={deal?.expected_close_date ?? ''}
            className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-cream/70 mb-1">Pipeline *</label>
          <select
            name="pipeline_id"
            value={pipelineId}
            onChange={(e) => setPipelineId(e.target.value)}
            required
            className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-cream/70 mb-1">Estagio *</label>
          <select
            name="stage_id"
            defaultValue={deal?.stage_id ?? stages[0]?.id ?? ''}
            required
            className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold"
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-cream/70 mb-1">Contato (ID)</label>
          <input
            name="contact_id"
            defaultValue={deal?.contact_id ?? ''}
            placeholder="uuid"
            className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="block text-sm text-cream/70 mb-1">Empresa (ID)</label>
          <input
            name="company_id"
            defaultValue={deal?.company_id ?? ''}
            placeholder="uuid"
            className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-cream/70 mb-1">
          Tags (separadas por virgula)
        </label>
        <input
          name="tags"
          defaultValue={deal?.tags?.join(', ') ?? ''}
          placeholder="hot, enterprise"
          className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold"
        />
      </div>

      {state?.error && <p className="text-red-400 text-sm">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="bg-gold text-charcoal font-semibold px-6 py-2 rounded-lg hover:bg-gold/90 disabled:opacity-50 transition-colors"
      >
        {pending ? 'Salvando...' : deal ? 'Salvar alteracoes' : 'Criar deal'}
      </button>
    </form>
  )
}
