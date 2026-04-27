import { z } from 'zod'

export const TASK_TYPES = ['task', 'call', 'email', 'meeting', 'follow_up', 'other'] as const
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const

const taskBaseSchema = z.object({
  title: z.string().min(1, 'Titulo obrigatorio').max(200),
  description: z.string().max(5000).nullable().optional(),
  type: z.enum(TASK_TYPES).default('task'),
  priority: z.enum(TASK_PRIORITIES).default('medium'),
  due_at: z.string().datetime().nullable().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  contact_id: z.string().uuid().nullable().optional(),
  deal_id: z.string().uuid().nullable().optional(),
})

export const taskSchema = taskBaseSchema.refine(
  (data) => !(data.contact_id && data.deal_id),
  { message: 'Tarefa pode vincular a contato OU deal, nao ambos', path: ['deal_id'] }
)

export const taskUpdateSchema = taskBaseSchema.partial()

export type TaskInput = z.infer<typeof taskSchema>
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>
