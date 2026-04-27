'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { logCall, logMeeting } from '@/lib/crm/activities'
import { NoteEditor } from './NoteEditor'

type ComposerProps = {
  subjectType: 'contact' | 'deal' | 'company'
  subjectId: string
}

const FILTER_CHIPS: { value: string; label: string }[] = [
  { value: 'note', label: 'Notas' },
  { value: 'call', label: 'Ligacoes' },
  { value: 'meeting', label: 'Reunioes' },
  { value: 'email', label: 'E-mails' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'stage_change', label: 'Estagio' },
  { value: 'task', label: 'Tarefas' },
]

export function TimelineFilters({ selectedTypes }: { selectedTypes: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function toggle(value: string) {
    const current = new Set(selectedTypes)
    if (current.has(value)) current.delete(value); else current.add(value)
    const params = new URLSearchParams(searchParams.toString())
    if (current.size === 0) params.delete('types'); else params.set('types', Array.from(current).join(','))
    router.push(`${pathname}?${params.toString()}`)
  }

  function clear() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('types')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs text-cream/50 uppercase tracking-wider">Filtrar:</span>
      {FILTER_CHIPS.map(c => {
        const active = selectedTypes.includes(c.value)
        return (
          <button key={c.value} type="button" onClick={() => toggle(c.value)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              active ? 'bg-gold text-charcoal border-gold' : 'bg-char-2 text-cream/70 border-char-3 hover:border-cream/30'
            }`}>{c.label}</button>
        )
      })}
      {selectedTypes.length > 0 && (
        <button type="button" onClick={clear} className="text-xs text-cream/50 hover:text-cream underline ml-1">Limpar</button>
      )}
    </div>
  )
}

export function ActivityComposer({ subjectType, subjectId }: ComposerProps) {
  const [open, setOpen] = useState<null | 'note' | 'call' | 'meeting'>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const subjectForActivity = subjectType === 'company' ? 'contact' : subjectType

  function close() { setOpen(null); setError(null) }

  function submitCall(form: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await logCall({
        subject_type: subjectForActivity,
        subject_id: subjectId,
        duration_minutes: form.get('duration_minutes') ? Number(form.get('duration_minutes')) : null,
        outcome: (form.get('outcome') as any) || null,
        body: (form.get('body') as string) || null,
      })
      if ('error' in result) setError(result.error ?? null); else { close(); router.refresh() }
    })
  }

  function submitMeeting(form: FormData) {
    setError(null)
    startTransition(async () => {
      const occurredAt = form.get('occurred_at') as string
      const result = await logMeeting({
        subject_type: subjectForActivity,
        subject_id: subjectId,
        duration_minutes: form.get('duration_minutes') ? Number(form.get('duration_minutes')) : null,
        body: (form.get('body') as string) || null,
        participants: form.get('participant_ids')?.toString().split(',').map(s => s.trim()).filter(Boolean) ?? [],
        occurred_at: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
      })
      if ('error' in result) setError(result.error ?? null); else { close(); router.refresh() }
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setOpen('note')} className="text-sm px-3 py-1.5 rounded-lg border border-char-3 text-cream hover:border-gold transition-colors">+ Nota</button>
      <button type="button" onClick={() => setOpen('call')} className="text-sm px-3 py-1.5 rounded-lg border border-char-3 text-cream hover:border-gold transition-colors">+ Ligacao</button>
      <button type="button" onClick={() => setOpen('meeting')} className="text-sm px-3 py-1.5 rounded-lg border border-char-3 text-cream hover:border-gold transition-colors">+ Reuniao</button>

      {open === 'note' && (
        <Modal title="Adicionar nota" onClose={close}>
          <NoteEditor subjectType={subjectType} subjectId={subjectId} onDone={close} />
        </Modal>
      )}

      {open === 'call' && (
        <Modal title="Registrar ligacao" onClose={close}>
          <form action={submitCall} className="space-y-3">
            <label className="block">
              <span className="text-xs text-cream/60">Duracao (min)</span>
              <input name="duration_minutes" type="number" min={0} max={600} className="w-full bg-char-3 text-cream rounded px-2 py-1 border border-char-3 focus:border-gold outline-none" />
            </label>
            <label className="block">
              <span className="text-xs text-cream/60">Outcome</span>
              <select name="outcome" className="w-full bg-char-3 text-cream rounded px-2 py-1 border border-char-3">
                <option value="">—</option>
                <option value="connected">Atendeu</option>
                <option value="voicemail">Caixa postal</option>
                <option value="no_answer">Sem resposta</option>
                <option value="rescheduled">Remarcada</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-cream/60">Resumo</span>
              <textarea name="body" rows={4} className="w-full bg-char-3 text-cream rounded px-2 py-1 border border-char-3 focus:border-gold outline-none" placeholder="O que foi discutido..." />
            </label>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={close} className="px-3 py-1.5 text-sm text-cream/70 hover:text-cream">Cancelar</button>
              <button type="submit" disabled={pending} className="px-3 py-1.5 text-sm bg-gold text-charcoal rounded disabled:opacity-50">{pending ? 'Salvando...' : 'Registrar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {open === 'meeting' && (
        <Modal title="Registrar reuniao" onClose={close}>
          <form action={submitMeeting} className="space-y-3">
            <label className="block">
              <span className="text-xs text-cream/60">Data e hora</span>
              <input name="occurred_at" type="datetime-local" required className="w-full bg-char-3 text-cream rounded px-2 py-1 border border-char-3 focus:border-gold outline-none" />
            </label>
            <label className="block">
              <span className="text-xs text-cream/60">Duracao (min)</span>
              <input name="duration_minutes" type="number" min={0} max={600} className="w-full bg-char-3 text-cream rounded px-2 py-1 border border-char-3" />
            </label>
            <label className="block">
              <span className="text-xs text-cream/60">Notas / agenda</span>
              <textarea name="body" rows={4} className="w-full bg-char-3 text-cream rounded px-2 py-1 border border-char-3 focus:border-gold outline-none" />
            </label>
            <input name="participant_ids" placeholder="IDs dos contatos (separar por vírgula)" className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream text-sm focus:outline-none focus:border-gold" />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={close} className="px-3 py-1.5 text-sm text-cream/70 hover:text-cream">Cancelar</button>
              <button type="submit" disabled={pending} className="px-3 py-1.5 text-sm bg-gold text-charcoal rounded disabled:opacity-50">{pending ? 'Salvando...' : 'Registrar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-charcoal/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-char-2 border border-char-3 rounded-xl p-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-cream font-semibold">{title}</h3>
          <button onClick={onClose} className="text-cream/50 hover:text-cream text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
