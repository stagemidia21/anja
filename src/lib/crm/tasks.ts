'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrg } from '@/lib/auth/require-org'
import { taskSchema, taskUpdateSchema, type TaskInput, type TaskUpdateInput } from '@/lib/validations/task'

export type TaskRow = {
  id: string
  title: string
  description: string | null
  type: string
  priority: string
  due_at: string | null
  assignee_id: string | null
  contact_id: string | null
  deal_id: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  contact?: { id: string; full_name: string } | null
  deal?: { id: string; title: string } | null
  assignee?: { id: string; full_name: string | null; email: string | null } | null
}

export async function createTask(input: TaskInput) {
  const parsed = taskSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { user, organizationId } = await requireOrg()
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      organization_id: organizationId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      priority: parsed.data.priority,
      due_at: parsed.data.due_at ?? null,
      assignee_id: parsed.data.assignee_id ?? user.id,
      contact_id: parsed.data.contact_id ?? null,
      deal_id: parsed.data.deal_id ?? null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/crm')
  revalidatePath('/crm/tasks')
  if (parsed.data.contact_id) revalidatePath(`/crm/contacts/${parsed.data.contact_id}`)
  if (parsed.data.deal_id) revalidatePath(`/crm/deals/${parsed.data.deal_id}`)

  return { data }
}

export async function updateTask(taskId: string, input: TaskUpdateInput) {
  const parsed = taskUpdateSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const { error } = await supabase
    .from('tasks')
    .update(parsed.data)
    .eq('id', taskId)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }

  revalidatePath('/crm')
  revalidatePath('/crm/tasks')
  if (parsed.data.contact_id) revalidatePath(`/crm/contacts/${parsed.data.contact_id}`)
  if (parsed.data.deal_id) revalidatePath(`/crm/deals/${parsed.data.deal_id}`)

  return { success: true }
}

export async function completeTask(taskId: string, opts?: { createActivity?: boolean }) {
  const { user, organizationId } = await requireOrg()
  const supabase = createClient()

  // Fetch task to get type + subject for optional activity creation
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('id, title, type, contact_id, deal_id, description')
    .eq('id', taskId)
    .eq('organization_id', organizationId)
    .single()

  if (fetchError || !task) return { error: fetchError?.message ?? 'Tarefa nao encontrada' }

  // Mark as completed
  const { error } = await supabase
    .from('tasks')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }

  // Optionally create activity record for timeline
  if (opts?.createActivity && (task.contact_id || task.deal_id)) {
    const activityTypeMap: Record<string, string> = {
      call: 'call',
      meeting: 'meeting',
      email: 'email',
    }
    const activityType = activityTypeMap[task.type] ?? 'task'

    await supabase.from('activities').insert({
      organization_id: organizationId,
      type: activityType,
      direction: 'internal',
      subject_type: task.deal_id ? 'deal' : 'contact',
      subject_id: task.deal_id ?? task.contact_id!,
      contact_id: task.contact_id ?? null,
      deal_id: task.deal_id ?? null,
      actor_id: user.id,
      body: task.description ?? `Tarefa concluida: ${task.title}`,
      metadata: { task_id: taskId, from_task: true },
      occurred_at: new Date().toISOString(),
    })
  }

  revalidatePath('/crm')
  revalidatePath('/crm/tasks')
  if (task.contact_id) revalidatePath(`/crm/contacts/${task.contact_id}`)
  if (task.deal_id) revalidatePath(`/crm/deals/${task.deal_id}`)

  return { success: true }
}

export async function uncompleteTask(taskId: string) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  // Fetch task to get subject ids for revalidation
  const { data: task } = await supabase
    .from('tasks')
    .select('contact_id, deal_id')
    .eq('id', taskId)
    .eq('organization_id', organizationId)
    .single()

  const { error } = await supabase
    .from('tasks')
    .update({ completed_at: null })
    .eq('id', taskId)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }

  revalidatePath('/crm')
  revalidatePath('/crm/tasks')
  if (task?.contact_id) revalidatePath(`/crm/contacts/${task.contact_id}`)
  if (task?.deal_id) revalidatePath(`/crm/deals/${task.deal_id}`)

  return { success: true }
}

export async function archiveTask(taskId: string) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const { data: task } = await supabase
    .from('tasks')
    .select('contact_id, deal_id')
    .eq('id', taskId)
    .eq('organization_id', organizationId)
    .single()

  const { error } = await supabase
    .from('tasks')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }

  revalidatePath('/crm')
  revalidatePath('/crm/tasks')
  if (task?.contact_id) revalidatePath(`/crm/contacts/${task.contact_id}`)
  if (task?.deal_id) revalidatePath(`/crm/deals/${task.deal_id}`)

  return { success: true }
}

export async function listTasksForContact(contactId: string) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, description, type, priority, due_at, assignee_id, contact_id, deal_id, completed_at, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('contact_id', contactId)
    .is('archived_at', null)
    .order('completed_at', { ascending: true, nullsFirst: true })
    .order('due_at', { ascending: true, nullsFirst: false })

  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as TaskRow[] }
}

export async function listTasksForDeal(dealId: string) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, description, type, priority, due_at, assignee_id, contact_id, deal_id, completed_at, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('deal_id', dealId)
    .is('archived_at', null)
    .order('completed_at', { ascending: true, nullsFirst: true })
    .order('due_at', { ascending: true, nullsFirst: false })

  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as TaskRow[] }
}

export async function listMyTasksToday() {
  const { user, organizationId } = await requireOrg()
  const supabase = createClient()

  // TODO(phase12): use org timezone from organizations.timezone instead of server local timezone
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const endIso = end.toISOString()

  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, description, type, priority, due_at, contact_id, deal_id, completed_at, contact:contacts!tasks_contact_id_fkey(id, full_name), deal:deals!tasks_deal_id_fkey(id, title)')
    .eq('organization_id', organizationId)
    .eq('assignee_id', user.id)
    .is('archived_at', null)
    .is('completed_at', null)
    .lte('due_at', endIso)
    .order('due_at', { ascending: true, nullsFirst: false })

  if (error) return { data: { overdue: [], today: [] }, error: error.message }

  const now = new Date().toISOString()
  const rows = (data ?? []) as unknown as TaskRow[]
  const overdue = rows.filter(t => t.due_at && t.due_at < now)
  const today = rows.filter(t => !t.due_at || t.due_at >= now)

  return { data: { overdue, today } }
}
