import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import { execFileSync } from 'child_process'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { resolve } from 'path'
import { checkRateLimit } from '@/lib/chat/rate-limit'
import { loadMessages } from '@/lib/chat/persistence'
import { findSmartSlot, type WorkSettings, DEFAULT_SETTINGS } from '@/lib/scheduler'
import type { UIMessage } from 'ai'

export const maxDuration = 60

const ROOT = resolve(process.cwd())

const serviceSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function callClaude(prompt: string, timeout = 60000): string {
  return execFileSync('claude', ['-p', prompt], {
    cwd: ROOT,
    timeout,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 5,
  }).trim()
}

function getCalendarClient() {
  const SA_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n')
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: SA_KEY,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
  return google.calendar({ version: 'v3', auth })
}

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'stagemidia21@gmail.com'

async function getUpcomingEvents() {
  try {
    const cal = getCalendarClient()
    const now = new Date()
    const in7days = new Date(now.getTime() + 7 * 86400000)
    const res = await cal.events.list({
      calendarId: CALENDAR_ID,
      timeMin: now.toISOString(),
      timeMax: in7days.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 30,
    })
    return (res.data.items ?? []).map(e => {
      const start = e.start?.dateTime ?? e.start?.date ?? ''
      const end = e.end?.dateTime ?? e.end?.date ?? ''
      const startFmt = start.includes('T')
        ? new Date(start).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
        : new Date(start).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
      const endFmt = end.includes('T')
        ? new Date(end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
        : ''
      return `- ${e.summary ?? '(sem título)'}: ${startFmt}${endFmt ? ` até ${endFmt}` : ''}`
    }).join('\n')
  } catch {
    return null
  }
}

async function getUserTasks(userId: string) {
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const { data } = await serviceSupabase
      .from('tasks')
      .select('title, status, priority, category, due_date, scheduled_at, note')
      .eq('user_id', userId)
      .neq('status', 'feito')
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(30)
    if (!data?.length) return null

    const lines = data.map(t => {
      const parts = [`[${t.status === 'fazendo' ? 'EM ANDAMENTO' : 'A FAZER'}]`, `"${t.title}"`]
      if (t.priority === 'alta') parts.push('🔴 alta prioridade')
      else if (t.priority === 'media') parts.push('🟡 média prioridade')
      else parts.push('⚪ baixa prioridade')
      if (t.category) parts.push(`categoria: ${t.category}`)
      if (t.due_date) {
        const diff = Math.ceil((new Date(t.due_date).getTime() - new Date(today).getTime()) / 86400000)
        if (diff < 0) parts.push(`⚠️ ATRASADA ${Math.abs(diff)}d`)
        else if (diff === 0) parts.push('prazo: hoje')
        else parts.push(`prazo: ${t.due_date}`)
      }
      if (t.scheduled_at) {
        const sched = new Date(t.scheduled_at).toLocaleString('pt-BR', {
          weekday: 'short', day: '2-digit', month: '2-digit',
          hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
        })
        parts.push(`agendada: ${sched}`)
      }
      if (t.note) parts.push(`obs: ${t.note.slice(0, 80)}`)
      return '- ' + parts.join(' | ')
    })
    return lines.join('\n')
  } catch {
    return null
  }
}

async function getUserSettings(userId: string): Promise<WorkSettings> {
  const { data } = await serviceSupabase
    .from('profiles')
    .select('work_start, work_end, lunch_start, lunch_end, work_days')
    .eq('id', userId)
    .single()
  if (!data?.work_start) return DEFAULT_SETTINGS
  return data as WorkSettings
}

async function getUserMemory(userId: string): Promise<string | null> {
  const { data } = await serviceSupabase
    .from('profiles')
    .select('ai_memory')
    .eq('id', userId)
    .single()
  return (data as { ai_memory?: string } | null)?.ai_memory ?? null
}

async function updateUserMemory(userId: string, currentHistory: string, lastResponse: string): Promise<void> {
  try {
    const { data: profile } = await serviceSupabase
      .from('profiles')
      .select('ai_memory')
      .eq('id', userId)
      .single()
    const existingMemory = (profile as { ai_memory?: string } | null)?.ai_memory ?? ''

    const prompt = `Você é um sistema de memória. Sua função é manter um resumo conciso das conversas entre o Homero e a Anja.

MEMÓRIA ATUAL (do que já aconteceu antes):
${existingMemory || '(nenhuma memória ainda)'}

ÚLTIMA TROCA:
Usuário: ${currentHistory.split('\n').slice(-4).join('\n')}
Anja: ${lastResponse.slice(0, 500)}

Atualize a memória com o que é relevante para conversas futuras: decisões tomadas, preferências reveladas, tarefas criadas, contexto importante. Ignore smalltalk e perguntas genéricas.

Responda APENAS com o texto da memória atualizada, máximo 400 palavras, em português BR.`

    const updated = callClaude(prompt, 30000)
    await serviceSupabase
      .from('profiles')
      .update({ ai_memory: updated } as Record<string, unknown>)
      .eq('id', userId)
  } catch { /* não bloquear a resposta por erro de memória */ }
}

function buildSystemPrompt(settings: WorkSettings) {
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const hojeISO = new Date().toISOString().slice(0, 10)

  return `Você é a Anja, secretária executiva com IA do Homero Zanichelli (Stage Mídia).

Personalidade: eficiente, direta, profissional. Sem enrolação. Responde em português BR.
Use markdown quando útil. Máximo 1-2 emojis por resposta.

Hoje é ${hoje} (${hojeISO}). Amanhã: ${amanha}. Fuso: America/Sao_Paulo.
Horário de trabalho: ${settings.work_start}–${settings.work_end} | Almoço: ${settings.lunch_start}–${settings.lunch_end}

IMPORTANTE: O Google Calendar JÁ está integrado via service account. Você TEM acesso total à agenda. Nunca peça autorização, nunca diga que não tem acesso, nunca sugira conectar o Google Calendar.

Você pode criar eventos e tarefas. Quando o usuário pedir, responda com um bloco no FINAL da resposta:

Para criar evento com hora específica:
[ACTION:CREATE_EVENT]{"title":"...","start_datetime":"${hojeISO}T14:00:00-03:00","end_datetime":"${hojeISO}T15:00:00-03:00","description":""}[/ACTION]

Para criar evento em slot livre (quando pedir "de manhã", "à tarde", "primeiro disponível"):
[ACTION:SMART_EVENT]{"title":"...","date":"${amanha}","period":"manha","duration_minutes":30,"description":""}[/ACTION]
Períodos válidos: manha, tarde, noite, qualquer

Para criar tarefa:
[ACTION:CREATE_TASK]{"title":"...","priority":"alta","due_date":"${hojeISO}"}[/ACTION]

Para excluir um evento (use o título exato conforme aparece na AGENDA):
[ACTION:DELETE_EVENT]{"title":"..."}[/ACTION]

Para reagendar/mover um evento (use o título exato conforme aparece na AGENDA):
[ACTION:UPDATE_EVENT]{"title":"...","start_datetime":"${hojeISO}T14:00:00-03:00","end_datetime":"${hojeISO}T15:00:00-03:00"}[/ACTION]

Regras:
- Sem hora exata + período indicado → SMART_EVENT
- Com hora exata → CREATE_EVENT
- due_date é opcional em CREATE_TASK
- priority: alta, media ou baixa
- DELETE_EVENT e UPDATE_EVENT: busca por título parcial, pega o mais próximo
- Bloco vai no final, sem texto depois
- Sem pedido de ação → sem bloco [ACTION]`
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 })
  const messages = await loadMessages(supabase, user.id)
  return Response.json(messages)
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 })

  const rateLimit = await checkRateLimit(supabase, user.id)
  if (!rateLimit.allowed) {
    return Response.json(
      { error: `Limite de ${rateLimit.limit} mensagens/mês atingido.`, code: 'RATE_LIMITED' },
      { status: 429 }
    )
  }

  const { messages }: { messages: UIMessage[] } = await req.json()
  const recentMessages = messages.slice(-20)
  const [settings, calendarEvents, taskContext, memory] = await Promise.all([
    getUserSettings(user.id),
    getUpcomingEvents(),
    getUserTasks(user.id),
    getUserMemory(user.id),
  ])

  const historico = recentMessages.map((m) => {
    const role = m.role === 'user' ? 'Usuário' : 'Anja'
    const text = m.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join(' ') ?? ''
    return `${role}: ${text}`
  }).join('\n')

  const systemPrompt = buildSystemPrompt(settings)
  const calendarContext = calendarEvents
    ? `\n\nAGENDA DOS PRÓXIMOS 7 DIAS (use para responder sobre horários livres e ocupados):\n${calendarEvents}`
    : ''
  const tasksContext = taskContext
    ? `\n\nTAREFAS PENDENTES DO USUÁRIO (use para responder sobre o que tem pra fazer, prioridades e atrasos):\n${taskContext}`
    : ''
  const memoryContext = memory
    ? `\n\nMEMÓRIA DE CONVERSAS ANTERIORES (contexto acumulado de sessões passadas):\n${memory}`
    : ''
  const prompt = `${systemPrompt}${calendarContext}${tasksContext}${memoryContext}\n\nHISTÓRICO:\n${historico}\n\nResponda como Anja:`

  const textId = crypto.randomUUID()

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      try {
        const raw = callClaude(prompt, 55000)

        const actionMatch = raw.match(/\[ACTION:([A-Z_]+)\]([\s\S]*?)\[\/ACTION\]/)
        let textOnly = raw.replace(/\[ACTION:[\s\S]*?\[\/ACTION\]/g, '').trim()

        if (actionMatch) {
          const actionType = actionMatch[1]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let actionData: Record<string, any>
          try {
            actionData = JSON.parse(actionMatch[2])
            if (typeof actionData.title === 'string') actionData.title = actionData.title.slice(0, 200)
            if (actionData.priority && !['alta','media','baixa'].includes(actionData.priority as string)) actionData.priority = 'media'
          } catch {
            actionData = {}
          }

          if (actionType === 'SMART_EVENT') {
            // Encontra slot livre na agenda
            try {
              const slot = await findSmartSlot(actionData.date, actionData.period, actionData.duration_minutes, settings)
              if (slot) {
                const cal = getCalendarClient()
                const res = await cal.events.insert({
                  calendarId: CALENDAR_ID,
                  requestBody: {
                    summary: actionData.title,
                    description: actionData.description || '',
                    start: { dateTime: slot.start_datetime, timeZone: 'America/Sao_Paulo' },
                    end: { dateTime: slot.end_datetime, timeZone: 'America/Sao_Paulo' },
                  },
                })
                const hora = new Date(slot.start_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                textOnly += `\n\n✅ **${actionData.title}** marcado às ${hora} · [Ver no Google Calendar](${res.data.htmlLink})`
              } else {
                textOnly += `\n\n⚠️ Não encontrei um slot livre ${actionData.period === 'manha' ? 'de manhã' : actionData.period === 'tarde' ? 'à tarde' : 'no período solicitado'}.`
              }
            } catch (err) {
              console.error('Erro ao criar smart event:', err)
              textOnly += '\n\n⚠️ Não consegui acessar a agenda agora.'
            }
          } else if (actionType === 'CREATE_EVENT') {
            try {
              const cal = getCalendarClient()
              const res = await cal.events.insert({
                calendarId: CALENDAR_ID,
                requestBody: {
                  summary: actionData.title,
                  description: actionData.description || '',
                  start: { dateTime: actionData.start_datetime, timeZone: 'America/Sao_Paulo' },
                  end: { dateTime: actionData.end_datetime, timeZone: 'America/Sao_Paulo' },
                },
              })
              textOnly += `\n\n✅ [Ver no Google Calendar](${res.data.htmlLink})`
            } catch (err) {
              console.error('Erro ao criar evento:', err)
              textOnly += '\n\n⚠️ Não consegui criar o evento automaticamente.'
            }
          } else if (actionType === 'CREATE_TASK') {
            try {
              await serviceSupabase.from('tasks').insert({
                user_id: user.id,
                title: actionData.title,
                priority: actionData.priority || 'media',
                status: 'fazer',
                due_date: actionData.due_date ?? null,
              })
            } catch (err) {
              console.error('Erro ao criar tarefa:', err)
            }
          } else if (actionType === 'DELETE_EVENT') {
            try {
              const cal = getCalendarClient()
              const now = new Date()
              const in30days = new Date(now.getTime() + 30 * 86400000)
              const list = await cal.events.list({
                calendarId: CALENDAR_ID,
                timeMin: new Date(now.getTime() - 7 * 86400000).toISOString(),
                timeMax: in30days.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 50,
                q: actionData.title,
              })
              const match = list.data.items?.[0]
              if (match?.id) {
                await cal.events.delete({ calendarId: CALENDAR_ID, eventId: match.id })
                textOnly += `\n\n🗑️ **${match.summary}** removido da agenda.`
              } else {
                textOnly += `\n\n⚠️ Não encontrei o evento "${actionData.title}" na agenda.`
              }
            } catch (err) {
              console.error('Erro ao excluir evento:', err)
              textOnly += '\n\n⚠️ Não consegui excluir o evento.'
            }
          } else if (actionType === 'UPDATE_EVENT') {
            try {
              const cal = getCalendarClient()
              const now = new Date()
              const in30days = new Date(now.getTime() + 30 * 86400000)
              const list = await cal.events.list({
                calendarId: CALENDAR_ID,
                timeMin: new Date(now.getTime() - 7 * 86400000).toISOString(),
                timeMax: in30days.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 50,
                q: actionData.title,
              })
              const match = list.data.items?.[0]
              if (match?.id) {
                const duration = match.end?.dateTime && match.start?.dateTime
                  ? new Date(match.end.dateTime).getTime() - new Date(match.start.dateTime).getTime()
                  : 3600000
                const newEnd = actionData.end_datetime
                  ?? new Date(new Date(actionData.start_datetime).getTime() + duration).toISOString()
                const res = await cal.events.patch({
                  calendarId: CALENDAR_ID,
                  eventId: match.id,
                  requestBody: {
                    start: { dateTime: actionData.start_datetime, timeZone: 'America/Sao_Paulo' },
                    end: { dateTime: newEnd, timeZone: 'America/Sao_Paulo' },
                  },
                })
                const hora = new Date(actionData.start_datetime).toLocaleString('pt-BR', {
                  weekday: 'short', day: '2-digit', month: '2-digit',
                  hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
                })
                textOnly += `\n\n✅ **${match.summary}** reagendado para ${hora} · [Ver](${res.data.htmlLink})`
              } else {
                textOnly += `\n\n⚠️ Não encontrei o evento "${actionData.title}" para reagendar.`
              }
            } catch (err) {
              console.error('Erro ao reagendar evento:', err)
              textOnly += '\n\n⚠️ Não consegui reagendar o evento.'
            }
          }
        }

        writer.write({ type: 'start-step' })
        writer.write({ type: 'text-start', id: textId })
        writer.write({ type: 'text-delta', id: textId, delta: textOnly })
        writer.write({ type: 'text-end', id: textId })
        writer.write({ type: 'finish-step' })
        writer.write({ type: 'finish', finishReason: 'stop' })

        // Atualiza memória a cada 5 mensagens (client salva as mensagens com session_id)
        const msgCount = messages.length
        if (msgCount % 5 === 0 || msgCount === 1) {
          updateUserMemory(user.id, historico, textOnly).catch(() => {})
        }
      } catch (err) {
        console.error('[chat] Erro:', err)
        writer.write({ type: 'text-start', id: textId })
        writer.write({ type: 'text-delta', id: textId, delta: 'Algo deu errado. Tenta de novo.' })
        writer.write({ type: 'text-end', id: textId })
        writer.write({ type: 'finish', finishReason: 'stop' })
      }
    },
  })

  return createUIMessageStreamResponse({ stream })
}
