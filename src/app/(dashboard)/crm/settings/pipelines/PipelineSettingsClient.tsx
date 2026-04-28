'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  createPipeline,
  updatePipeline,
  archivePipeline,
  createStage,
  updateStage,
  archiveStage,
  reorderStages,
} from '@/lib/crm/pipelines'

type Stage = {
  id: string
  name: string
  position: number
  stage_type: 'open' | 'won' | 'lost'
  default_probability: number
}
type Pipeline = {
  id: string
  name: string
  is_default: boolean
  rotten_days: number
  stages: Stage[]
}

export function PipelineSettingsClient({ initial }: { initial: Pipeline[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null)
  const selected = initial.find((p) => p.id === selectedId) ?? null

  async function handleCreatePipeline(fd: FormData) {
    start(async () => {
      const res = await createPipeline(fd)
      if ('error' in res && res.error) toast.error(res.error)
      else {
        toast.success('Pipeline criado')
        router.refresh()
      }
    })
  }

  async function handleUpdatePipeline(id: string, fd: FormData) {
    start(async () => {
      const res = await updatePipeline(id, fd)
      if ('error' in res && res.error) toast.error(res.error)
      else {
        toast.success('Pipeline atualizado')
        router.refresh()
      }
    })
  }

  async function handleArchivePipeline(id: string) {
    if (!confirm('Arquivar este pipeline?')) return
    start(async () => {
      const res = await archivePipeline(id)
      if ('error' in res && res.error) toast.error(res.error)
      else {
        toast.success('Pipeline arquivado')
        router.refresh()
      }
    })
  }

  async function handleCreateStage(pipelineId: string, fd: FormData) {
    start(async () => {
      const res = await createStage(pipelineId, fd)
      if ('error' in res && res.error) toast.error(res.error)
      else {
        toast.success('Estagio criado')
        router.refresh()
      }
    })
  }

  async function handleUpdateStage(stageId: string, fd: FormData) {
    start(async () => {
      const res = await updateStage(stageId, fd)
      if ('error' in res && res.error) toast.error(res.error)
      else {
        toast.success('Estagio atualizado')
        router.refresh()
      }
    })
  }

  async function handleArchiveStage(stageId: string) {
    if (!confirm('Arquivar este estagio?')) return
    start(async () => {
      const res = await archiveStage(stageId)
      if ('error' in res && res.error) toast.error(res.error)
      else {
        toast.success('Estagio arquivado')
        router.refresh()
      }
    })
  }

  async function handleMoveStage(pipelineId: string, stageId: string, dir: -1 | 1) {
    if (!selected) return
    const sorted = [...selected.stages].sort((a, b) => a.position - b.position)
    const idx = sorted.findIndex((s) => s.id === stageId)
    const swap = idx + dir
    if (idx < 0 || swap < 0 || swap >= sorted.length) return
    const tmp = sorted[idx].position
    sorted[idx].position = sorted[swap].position
    sorted[swap].position = tmp
    const payload = sorted.map((s) => ({ id: s.id, position: s.position }))
    start(async () => {
      const res = await reorderStages({ pipeline_id: pipelineId, stages: payload })
      if ('error' in res && res.error) toast.error(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="grid grid-cols-[240px_1fr] gap-4">
      <aside className="space-y-2">
        <ul className="space-y-1">
          {initial.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedId === p.id ? 'bg-char-3 text-cream' : 'text-cream/70 hover:bg-char-2'
                }`}
              >
                {p.name}
                {p.is_default && <span className="ml-1 text-gold text-xs">·padrao</span>}
              </button>
            </li>
          ))}
        </ul>

        <details className="mt-4 p-3 rounded-lg border border-char-3">
          <summary className="text-cream text-sm cursor-pointer">+ Novo pipeline</summary>
          <form action={handleCreatePipeline} className="space-y-2 mt-3">
            <input
              name="name"
              placeholder="Nome"
              required
              className="w-full bg-char-2 border border-char-3 rounded px-2 py-1 text-sm text-cream"
            />
            <label className="flex items-center gap-2 text-xs text-cream/70">
              <input type="checkbox" name="is_default" value="true" />
              Definir como padrao
            </label>
            <input
              name="rotten_days"
              type="number"
              min="1"
              max="365"
              defaultValue="30"
              className="w-full bg-char-2 border border-char-3 rounded px-2 py-1 text-sm text-cream"
              placeholder="rotten_days"
            />
            <button
              type="submit"
              disabled={pending}
              className="w-full bg-gold text-charcoal text-sm py-1 rounded disabled:opacity-50"
            >
              Criar
            </button>
          </form>
        </details>
      </aside>

      {selected && (
        <section className="space-y-5">
          <form
            action={(fd) => handleUpdatePipeline(selected.id, fd)}
            className="space-y-3 p-4 bg-char-2 border border-char-3 rounded-lg"
          >
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-cream/60 mb-1">Nome</label>
                <input
                  name="name"
                  defaultValue={selected.name}
                  required
                  className="w-full bg-charcoal border border-char-3 rounded px-2 py-1 text-sm text-cream"
                />
              </div>
              <div>
                <label className="block text-xs text-cream/60 mb-1">Rotten days</label>
                <input
                  name="rotten_days"
                  type="number"
                  min="1"
                  max="365"
                  defaultValue={selected.rotten_days}
                  className="w-full bg-charcoal border border-char-3 rounded px-2 py-1 text-sm text-cream"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-cream/70">
              <input
                type="checkbox"
                name="is_default"
                value="true"
                defaultChecked={selected.is_default}
              />
              Padrao
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="bg-gold text-charcoal font-semibold text-sm px-4 py-1.5 rounded disabled:opacity-50"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => handleArchivePipeline(selected.id)}
                disabled={pending}
                className="text-red-300 text-sm px-3 py-1.5 border border-char-3 rounded hover:border-red-500"
              >
                Arquivar
              </button>
            </div>
          </form>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-cream/70 uppercase tracking-wider">
              Estagios
            </h3>
            {[...selected.stages]
              .sort((a, b) => a.position - b.position)
              .map((s) => (
                <form
                  key={s.id}
                  action={(fd) => handleUpdateStage(s.id, fd)}
                  className="grid grid-cols-[1fr_120px_120px_80px_auto_auto_auto] gap-2 items-end p-3 bg-char-2 border border-char-3 rounded-lg"
                >
                  <div>
                    <label className="block text-xs text-cream/60 mb-1">Nome</label>
                    <input
                      name="name"
                      defaultValue={s.name}
                      required
                      className="w-full bg-charcoal border border-char-3 rounded px-2 py-1 text-sm text-cream"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-cream/60 mb-1">Tipo</label>
                    <select
                      name="stage_type"
                      defaultValue={s.stage_type}
                      className="w-full bg-charcoal border border-char-3 rounded px-2 py-1 text-sm text-cream"
                    >
                      <option value="open">Aberto</option>
                      <option value="won">Ganho</option>
                      <option value="lost">Perdido</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-cream/60 mb-1">Prob. %</label>
                    <input
                      name="default_probability"
                      type="number"
                      min="0"
                      max="100"
                      defaultValue={s.default_probability}
                      className="w-full bg-charcoal border border-char-3 rounded px-2 py-1 text-sm text-cream"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-cream/60 mb-1">Pos</label>
                    <input
                      name="position"
                      type="number"
                      step="0.0001"
                      defaultValue={s.position}
                      className="w-full bg-charcoal border border-char-3 rounded px-2 py-1 text-sm text-cream"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleMoveStage(selected.id, s.id, -1)}
                    className="text-cream/50 text-xs hover:text-cream border border-char-3 rounded px-2 py-1"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveStage(selected.id, s.id, 1)}
                    className="text-cream/50 text-xs hover:text-cream border border-char-3 rounded px-2 py-1"
                  >
                    ↓
                  </button>
                  <div className="flex gap-1">
                    <button
                      type="submit"
                      disabled={pending}
                      className="bg-gold text-charcoal text-xs px-2 py-1 rounded disabled:opacity-50"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchiveStage(s.id)}
                      className="text-red-300 text-xs px-2 py-1 border border-char-3 rounded hover:border-red-500"
                    >
                      Arquivar
                    </button>
                  </div>
                </form>
              ))}

            <form
              action={(fd) => handleCreateStage(selected.id, fd)}
              className="grid grid-cols-[1fr_120px_120px_80px_auto] gap-2 items-end p-3 border border-dashed border-char-3 rounded-lg"
            >
              <div>
                <label className="block text-xs text-cream/60 mb-1">Novo estagio</label>
                <input
                  name="name"
                  placeholder="Ex: Demo agendada"
                  required
                  className="w-full bg-char-2 border border-char-3 rounded px-2 py-1 text-sm text-cream"
                />
              </div>
              <select
                name="stage_type"
                defaultValue="open"
                className="bg-char-2 border border-char-3 rounded px-2 py-1 text-sm text-cream"
              >
                <option value="open">Aberto</option>
                <option value="won">Ganho</option>
                <option value="lost">Perdido</option>
              </select>
              <input
                name="default_probability"
                type="number"
                min="0"
                max="100"
                defaultValue="50"
                className="bg-char-2 border border-char-3 rounded px-2 py-1 text-sm text-cream"
                placeholder="Prob %"
              />
              <input
                name="position"
                type="number"
                step="0.0001"
                defaultValue={((selected.stages.at(-1)?.position ?? 0) + 1).toFixed(4)}
                className="bg-char-2 border border-char-3 rounded px-2 py-1 text-sm text-cream"
                placeholder="Pos"
              />
              <button
                type="submit"
                disabled={pending}
                className="bg-gold text-charcoal text-sm px-3 py-1 rounded disabled:opacity-50"
              >
                + Criar
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  )
}
