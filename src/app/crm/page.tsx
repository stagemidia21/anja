import Link from 'next/link'
import { requireUser } from '@/lib/auth/get-current-user'
import { listMyTasksToday } from '@/lib/crm/tasks'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskQuickCreate } from '@/components/tasks/TaskQuickCreate'

export default async function CrmDashboard() {
  const user = await requireUser()
  const result = await listMyTasksToday()
  const overdue = 'error' in result ? [] : result.data.overdue
  const today = 'error' in result ? [] : result.data.today
  const error = 'error' in result ? result.error : null

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-cream">Bom dia, {user.email?.split('@')[0] ?? 'vendedor'}</h1>
        <p className="text-cream/50 text-sm mt-1">Suas tarefas para hoje.</p>
      </div>

      <TaskQuickCreate />

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider">
            Atrasadas {overdue.length > 0 && <span className="text-cream/40 ml-1">({overdue.length})</span>}
          </h2>
        </div>
        <TaskList tasks={overdue} emptyMessage="Sem tarefas atrasadas." />
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gold uppercase tracking-wider">
            Hoje {today.length > 0 && <span className="text-cream/40 ml-1">({today.length})</span>}
          </h2>
          <Link href="/crm/tasks" className="text-xs text-cream/50 hover:text-gold">Ver todas &#8594;</Link>
        </div>
        <TaskList tasks={today} emptyMessage="Tudo certo por hoje." />
      </section>
    </div>
  )
}
