import { tool } from 'ai'
import { z } from 'zod'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { listEvents, createEvent } from '@/lib/google/calendar'

const serviceSupabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export function createAnjaTools(userId: string, providerToken?: string | null) {
  return {
    create_calendar_event: tool({
      description: 'Cria um evento no Google Calendar do usuário',
      inputSchema: z.object({
        title: z.string().describe('Título do evento'),
        start_datetime: z.string().describe('Data e hora de início em ISO 8601 com timezone America/Sao_Paulo'),
        end_datetime: z.string().describe('Data e hora de término em ISO 8601 com timezone America/Sao_Paulo'),
        description: z.string().optional().describe('Descrição do evento'),
        location: z.string().optional().describe('Local do evento'),
      }),
      execute: async (args) => {
        if (!providerToken) return { success: false, error: 'Google Calendar não conectado. Faça login com o Google para usar essa funcionalidade.' }
        try {
          const result = await createEvent(providerToken, args)
          return { success: true, event_id: result?.id, link: result?.htmlLink }
        } catch (err) {
          return { success: false, error: String(err) }
        }
      },
    }),

    list_calendar_events: tool({
      description: 'Lista eventos do Google Calendar em um período',
      inputSchema: z.object({
        start_date: z.string().describe('Data de início no formato YYYY-MM-DD'),
        end_date: z.string().describe('Data de término no formato YYYY-MM-DD'),
      }),
      execute: async ({ start_date, end_date }) => {
        if (!providerToken) return { success: false, error: 'Google Calendar não conectado. Faça login com o Google.' }
        try {
          const events = await listEvents(providerToken, start_date, end_date)
          return { success: true, events, total: events.length }
        } catch (err) {
          return { success: false, error: String(err) }
        }
      },
    }),

    create_task: tool({
      description: 'Cria uma nova tarefa para o usuário',
      inputSchema: z.object({
        title: z.string().describe('Título da tarefa'),
        priority: z.enum(['alta', 'media', 'baixa']).default('media').describe('Prioridade da tarefa'),
        due_date: z.string().optional().describe('Data de vencimento no formato YYYY-MM-DD'),
        note: z.string().optional().describe('Observação adicional'),
        scheduled_at: z.string().optional().describe('Data e hora agendada em ISO 8601'),
        duration_minutes: z.number().optional().describe('Duração em minutos'),
      }),
      execute: async (args) => {
        try {
          const { data, error } = await serviceSupabase
            .from('tasks')
            .insert({
              user_id: userId,
              title: args.title,
              priority: args.priority,
              status: 'fazer',
              due_date: args.due_date ?? null,
              note: args.note ?? null,
              scheduled_at: args.scheduled_at ?? null,
              duration_minutes: args.duration_minutes ?? null,
            })
            .select()
            .single()
          if (error) return { success: false, error: error.message }
          return { success: true, task: data }
        } catch (err) {
          return { success: false, error: String(err) }
        }
      },
    }),

    list_tasks: tool({
      description: 'Lista as tarefas do usuário',
      inputSchema: z.object({
        status: z.enum(['fazer', 'fazendo', 'feito']).optional().describe('Filtrar por status'),
        priority: z.enum(['alta', 'media', 'baixa']).optional().describe('Filtrar por prioridade'),
      }),
      execute: async ({ status, priority }) => {
        try {
          let query = serviceSupabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .order('scheduled_at', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false })
          if (status) query = query.eq('status', status)
          if (priority) query = query.eq('priority', priority)
          const { data, error } = await query
          if (error) return { success: false, error: error.message }
          return { success: true, tasks: data ?? [], total: (data ?? []).length }
        } catch (err) {
          return { success: false, error: String(err) }
        }
      },
    }),
  }
}
