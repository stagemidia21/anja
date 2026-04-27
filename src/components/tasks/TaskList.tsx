'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { completeTask, uncompleteTask, archiveTask } from '@/lib/crm/tasks'
import type { TaskRow } from '@/lib/crm/tasks'

type ListProps = { tasks: TaskRow[]; emptyMessage?: string }

const PRIORITY_COLOR: Record<string, string> = {
  high:   'text-red-400 border-red-400/30',
  medium: 'text-gold border-gold/30',
  low:    'text-cream/50 border-char-3',
}

function formatDue(iso: string | null): { label: string; overdue: boolean } | null {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  const overdue = d < now
  const sameDay = d.toDateString() === now.toDateString()
  const label = sameDay
    ? `Hoje ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  return { label, overdue }
}

export function TaskList({ tasks, emptyMessage }: ListProps) {
  if (tasks.length === 0) {
    return <p className="text-cream/40 text-sm italic">{emptyMessage ?? 'Sem tarefas.'}</p>
  }
  return (
    <div className="space-y-2">
      {tasks.map(t => <TaskRowItem key={t.id} task={t} />)}
    </div>
  )
}

function TaskRowItem({ task }: { task: TaskRow }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const done = !!task.completed_at
  const due = formatDue(task.due_at)

  function toggle() {
    startTransition(async () => {
      const result = done ? await uncompleteTask(task.id) : await completeTask(task.id, { createActivity: true })
      if (!('error' in result)) router.refresh()
    })
  }

  function archive() {
    if (!confirm('Arquivar tarefa?')) return
    startTransition(async () => {
      const result = await archiveTask(task.id)
      if (!('error' in result)) router.refresh()
    })
  }

  return (
    <div className={`flex items-start gap-3 bg-char-2 border border-char-3 rounded-lg p-3 ${done ? 'opacity-60' : ''}`}>
      <button type="button" onClick={toggle} disabled={pending}
        className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
          done ? 'bg-gold border-gold text-charcoal' : 'border-cream/30 hover:border-gold'
        }`}
        aria-label={done ? 'Desmarcar tarefa' : 'Concluir tarefa'}>
        {done && <span className="text-xs leading-none">&#10003;</span>}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm text-cream ${done ? 'line-through text-cream/50' : ''}`}>{task.title}</span>
          <span className={`text-[10px] uppercase px-1.5 py-0.5 border rounded ${PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.medium}`}>
            {task.priority}
          </span>
          {due && (
            <span className={`text-xs ${due.overdue && !done ? 'text-red-400' : 'text-cream/60'}`}>
              {due.overdue && !done ? 'Atrasada — ' : ''}{due.label}
            </span>
          )}
        </div>
        {task.description && <p className="text-xs text-cream/60 mt-1">{task.description}</p>}
        <div className="text-xs text-cream/40 mt-1 flex gap-2 flex-wrap">
          {task.contact && <Link href={`/crm/contacts/${task.contact.id}`} className="hover:text-gold">{task.contact.full_name}</Link>}
          {task.deal && <Link href={`/crm/deals/${task.deal.id}`} className="hover:text-gold">{task.deal.title}</Link>}
        </div>
      </div>
      <button type="button" onClick={archive} disabled={pending}
        className="text-xs text-cream/40 hover:text-red-400">
        Arquivar
      </button>
    </div>
  )
}
