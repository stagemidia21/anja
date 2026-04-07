import { tool } from 'ai'
import { z } from 'zod'

export const anjaTools = {
  create_calendar_event: tool({
    description: 'Cria um evento no Google Calendar do usuário',
    inputSchema: z.object({
      title: z.string().describe('Título do evento'),
      start_datetime: z.string().describe('Data e hora de início em ISO 8601'),
      end_datetime: z.string().describe('Data e hora de término em ISO 8601'),
      description: z.string().optional().describe('Descrição do evento'),
      location: z.string().optional().describe('Local do evento'),
    }),
    execute: async (_args) => {
      try {
        return { success: false, error: 'Google Calendar ainda não conectado. Disponível na próxima atualização.' }
      } catch {
        return { success: false, error: 'Erro inesperado.' }
      }
    },
  }),

  list_calendar_events: tool({
    description: 'Lista eventos do Google Calendar em um período',
    inputSchema: z.object({
      start_date: z.string().describe('Data de início no formato YYYY-MM-DD'),
      end_date: z.string().describe('Data de término no formato YYYY-MM-DD'),
    }),
    execute: async (_args) => {
      try {
        return { success: false, error: 'Google Calendar ainda não conectado. Disponível na próxima atualização.' }
      } catch {
        return { success: false, error: 'Erro inesperado.' }
      }
    },
  }),

  create_task: tool({
    description: 'Cria uma nova tarefa para o usuário',
    inputSchema: z.object({
      title: z.string().describe('Título da tarefa'),
      priority: z.enum(['alta', 'media', 'baixa']).default('media').describe('Prioridade da tarefa'),
      category: z.string().optional().describe('Categoria da tarefa'),
      due_date: z.string().optional().describe('Data de vencimento no formato YYYY-MM-DD'),
      note: z.string().optional().describe('Observação adicional'),
    }),
    execute: async (_args) => {
      try {
        return { success: false, error: 'Gestão de tarefas disponível na próxima atualização.' }
      } catch {
        return { success: false, error: 'Erro inesperado.' }
      }
    },
  }),

  list_tasks: tool({
    description: 'Lista as tarefas do usuário',
    inputSchema: z.object({
      status: z.enum(['fazer', 'fazendo', 'feito']).optional().describe('Filtrar por status'),
      priority: z.enum(['alta', 'media', 'baixa']).optional().describe('Filtrar por prioridade'),
    }),
    execute: async (_args) => {
      try {
        return { success: false, error: 'Gestão de tarefas disponível na próxima atualização.' }
      } catch {
        return { success: false, error: 'Erro inesperado.' }
      }
    },
  }),
}
