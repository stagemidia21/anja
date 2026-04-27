import Link from 'next/link'
import { requireOrg } from '@/lib/auth/require-org'
import { createClient } from '@/lib/supabase/server'
import { TaskList } from '@/components/tasks/TaskList'

type Filter = 'my' | 'overdue' | 'done' | 'all'

export default async function TasksPage({ searchParams }: { searchParams?: { filter?: string } }) {
  const { user, organizationId } = await requireOrg()
  const filter: Filter = (['my', 'overdue', 'done', 'all'].includes(searchParams?.filter ?? '') ? (searchParams!.filter as Filter) : 'my')

  const supabase = createClient()

  let q = supabase
    .from('tasks')
    .select(`
      id, title, description, type, priority, due_at, assignee_id, contact_id, deal_id, completed_at, created_at, updated_at,
      contact:contacts!tasks_contact_id_fkey(id, full_name),
      deal:deals!tasks_deal_id_fkey(id, title)
    `)
    .eq('organization_id', organizationId)
    .is('archived_at', null)
    .order('completed_at', { ascending: true, nullsFirst: true })
    .order('due_at', { ascending: true, nullsFirst: false })
    .limit(200)

  if (filter === 'my') q = q.eq('assignee_id', user.id).is('completed_at', null)
  else if (filter === 'overdue') q = q.is('completed_at', null).lt('due_at', new Date().toISOString()).not('due_at', 'is', null)
  else if (filter === 'done') q = q.not('completed_at', 'is', null)

  const { data, error } = await q
  const tasks = (data ?? []) as any[]

  const chips: { value: Filter; label: string }[] = [
    { value: 'my', label: 'Minhas abertas' },
    { value: 'overdue', label: 'Atrasadas' },
    { value: 'all', label: 'Todas' },
    { value: 'done', label: 'Concluidas' },
  ]

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-cream">Tarefas</h1>
        <Link href="/crm/tasks/new" className="px-4 py-2 text-sm bg-gold text-charcoal rounded">+ Nova tarefa</Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {chips.map(c => (
          <Link
            key={c.value}
            href={`/crm/tasks?filter=${c.value}`}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filter === c.value
                ? 'bg-gold text-charcoal border-gold'
                : 'bg-char-2 text-cream/70 border-char-3 hover:border-cream/30'
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm">{error.message}</p>}
      <TaskList tasks={tasks} emptyMessage="Nenhuma tarefa neste filtro." />
    </div>
  )
}
