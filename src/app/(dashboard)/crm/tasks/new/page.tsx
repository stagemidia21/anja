import Link from 'next/link'
import { requireOrg } from '@/lib/auth/require-org'
import { TaskForm } from '@/components/tasks/TaskForm'

export default async function NewTaskPage({ searchParams }: { searchParams?: { contact?: string; deal?: string } }) {
  await requireOrg()

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/crm/tasks" className="text-cream/50 hover:text-cream text-sm">&#8592; Tarefas</Link>
        <span className="text-cream/30">/</span>
        <h1 className="text-xl font-semibold text-cream">Nova tarefa</h1>
      </div>
      <TaskForm
        mode="create"
        initial={{
          contact_id: searchParams?.contact ?? null,
          deal_id: searchParams?.deal ?? null,
        }}
        redirectTo={searchParams?.contact ? `/crm/contacts/${searchParams.contact}` : searchParams?.deal ? `/crm/deals/${searchParams.deal}` : '/crm/tasks'}
      />
    </div>
  )
}
