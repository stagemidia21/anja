'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createTask } from '@/lib/crm/tasks'

export function TaskQuickCreate() {
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function submit() {
    if (!title.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await createTask({
        title: title.trim(),
        type: 'task',
        priority: 'medium',
        due_at: due ? new Date(due).toISOString() : new Date().toISOString(),
      } as any)
      if ('error' in result && result.error) setError(result.error)
      else { setTitle(''); setDue(''); router.refresh() }
    })
  }

  return (
    <div className="bg-char-2 border border-char-3 rounded-lg p-3 flex gap-2 items-center">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        placeholder="Nova tarefa rapida..."
        className="flex-1 bg-transparent text-cream text-sm outline-none placeholder:text-cream/30"
      />
      <input
        type="datetime-local"
        value={due}
        onChange={e => setDue(e.target.value)}
        className="bg-char-3 text-cream text-xs rounded px-2 py-1 border border-char-3"
      />
      <button type="button" onClick={submit} disabled={pending || !title.trim()}
        className="px-3 py-1 text-sm bg-gold text-charcoal rounded disabled:opacity-50">
        {pending ? '...' : 'Adicionar'}
      </button>
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  )
}
