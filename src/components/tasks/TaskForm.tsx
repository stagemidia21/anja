'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createTask, updateTask } from '@/lib/crm/tasks'
import { TASK_TYPES, TASK_PRIORITIES } from '@/lib/validations/task'

type Props = {
  mode: 'create' | 'edit'
  taskId?: string
  initial?: {
    title?: string
    description?: string | null
    type?: string
    priority?: string
    due_at?: string | null
    assignee_id?: string | null
    contact_id?: string | null
    deal_id?: string | null
  }
  redirectTo?: string
}

const TYPE_LABELS: Record<string, string> = {
  task: 'Tarefa',
  call: 'Ligar',
  email: 'E-mail',
  meeting: 'Reuniao',
  follow_up: 'Follow-up',
  other: 'Outro',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Media',
  high: 'Alta',
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function TaskForm({ mode, taskId, initial, redirectTo = '/crm/tasks' }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(form: FormData) {
    setError(null)
    const payload = {
      title: form.get('title') as string,
      description: (form.get('description') as string) || null,
      type: (form.get('type') as string) || 'task',
      priority: (form.get('priority') as string) || 'medium',
      due_at: form.get('due_at') ? new Date(form.get('due_at') as string).toISOString() : null,
      assignee_id: (form.get('assignee_id') as string) || null,
      contact_id: (form.get('contact_id') as string) || null,
      deal_id: (form.get('deal_id') as string) || null,
    }

    startTransition(async () => {
      const result = mode === 'create'
        ? await createTask(payload as any)
        : await updateTask(taskId!, payload as any)
      if ('error' in result && result.error) setError(result.error)
      else router.push(redirectTo)
    })
  }

  return (
    <form action={onSubmit} className="space-y-4 max-w-xl">
      <label className="block">
        <span className="text-xs text-cream/60">Titulo</span>
        <input name="title" required maxLength={200} defaultValue={initial?.title ?? ''}
          className="w-full bg-char-3 text-cream rounded px-3 py-2 border border-char-3 focus:border-gold outline-none" />
      </label>

      <label className="block">
        <span className="text-xs text-cream/60">Descricao</span>
        <textarea name="description" rows={3} defaultValue={initial?.description ?? ''}
          className="w-full bg-char-3 text-cream rounded px-3 py-2 border border-char-3 focus:border-gold outline-none" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-cream/60">Tipo</span>
          <select name="type" defaultValue={initial?.type ?? 'task'}
            className="w-full bg-char-3 text-cream rounded px-3 py-2 border border-char-3">
            {TASK_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-cream/60">Prioridade</span>
          <select name="priority" defaultValue={initial?.priority ?? 'medium'}
            className="w-full bg-char-3 text-cream rounded px-3 py-2 border border-char-3">
            {TASK_PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p] ?? p}</option>)}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-xs text-cream/60">Prazo</span>
        <input name="due_at" type="datetime-local" defaultValue={toDatetimeLocalValue(initial?.due_at)}
          className="w-full bg-char-3 text-cream rounded px-3 py-2 border border-char-3" />
      </label>

      <input type="hidden" name="contact_id" defaultValue={initial?.contact_id ?? ''} />
      <input type="hidden" name="deal_id" defaultValue={initial?.deal_id ?? ''} />
      <input type="hidden" name="assignee_id" defaultValue={initial?.assignee_id ?? ''} />
      <p className="text-xs text-cream/40">
        Vinculo a contato/deal e atribuicao a outro vendedor disponiveis via link direto da pagina do contato/deal (v1 limitado).
      </p>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="px-4 py-2 text-sm bg-gold text-charcoal rounded disabled:opacity-50">
          {pending ? 'Salvando...' : (mode === 'create' ? 'Criar tarefa' : 'Salvar')}
        </button>
        <button type="button" onClick={() => router.push(redirectTo)}
          className="px-4 py-2 text-sm border border-char-3 text-cream hover:border-gold rounded">
          Cancelar
        </button>
      </div>
    </form>
  )
}
