/**
 * Anja — Bot do Telegram (ESM)
 * node src/telegram/bot.mjs
 */

import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../../..')
config({ path: resolve(__dirname, '../../.env.local') })

import { Telegraf } from 'telegraf'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SA_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const SA_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n')
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'stagemidia21@gmail.com'

if (!BOT_TOKEN) { console.error('Falta TELEGRAM_BOT_TOKEN'); process.exit(1) }

const bot = new Telegraf(BOT_TOKEN)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Google Calendar via Service Account
function getCalendarClient() {
  const auth = new google.auth.JWT({
    email: SA_EMAIL,
    key: SA_KEY,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
  return google.calendar({ version: 'v3', auth })
}

async function criarEvento(evento) {
  const cal = getCalendarClient()
  const res = await cal.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: evento.title,
      description: evento.description || '',
      start: { dateTime: evento.start_datetime, timeZone: 'America/Sao_Paulo' },
      end: { dateTime: evento.end_datetime, timeZone: 'America/Sao_Paulo' },
    },
  })
  return res.data
}

function callClaude(prompt, timeout = 120000) {
  return execFileSync('claude', ['-p', prompt], {
    cwd: ROOT, timeout, encoding: 'utf8', maxBuffer: 1024 * 1024 * 5,
  }).trim()
}

const SYSTEM_PROMPT = `Você é a Anja, secretária executiva com IA do Homero Zanichelli (Stage Mídia).

Personalidade: eficiente, direta, profissional. Sem enrolação. Responde em português BR.
Você está no Telegram — respostas curtas e objetivas (máximo 3 parágrafos).

Você pode ajudar com: tarefas e prioridades, compromissos e agenda, rascunhos de textos, análises de negócio.

Hoje é ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}.`

const history = {}
function getHistory(chatId) {
  if (!history[chatId]) history[chatId] = []
  return history[chatId]
}

function chat(chatId, userMessage) {
  const msgs = getHistory(chatId)
  msgs.push(`Usuário: ${userMessage}`)
  const contexto = msgs.slice(-10).join('\n')
  const prompt = `${SYSTEM_PROMPT}\n\nHISTÓRICO:\n${contexto}\n\nResponda como Anja (apenas sua resposta, sem prefixo):`
  const reply = callClaude(prompt, 60000)
  msgs.push(`Anja: ${reply}`)
  return reply
}

async function getUserSettings(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('work_start, work_end, lunch_start, lunch_end, work_days')
    .eq('id', userId)
    .single()
  return data || { work_start: '08:00', work_end: '18:00', lunch_start: '12:00', lunch_end: '13:00', work_days: [1,2,3,4,5] }
}

function toMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
function fromMinutes(minutes) {
  return `${Math.floor(minutes/60).toString().padStart(2,'0')}:${(minutes%60).toString().padStart(2,'0')}`
}

async function getBusySlotsForDay(date) {
  const cal = getCalendarClient()
  const timeMin = new Date(`${date}T00:00:00-03:00`).toISOString()
  const timeMax = new Date(`${date}T23:59:59-03:00`).toISOString()
  const res = await cal.events.list({ calendarId: CALENDAR_ID, timeMin, timeMax, singleEvents: true, orderBy: 'startTime', maxResults: 50 })
  return (res.data.items || [])
    .filter(e => e.start?.dateTime)
    .map(e => {
      const s = new Date(e.start.dateTime), en = new Date(e.end.dateTime)
      return { start: s.getHours()*60+s.getMinutes(), end: en.getHours()*60+en.getMinutes() }
    }).sort((a,b) => a.start - b.start)
}

function findFreeSlot(busySlots, period, durationMinutes, settings) {
  const periodRanges = {
    manha: { start: settings.work_start, end: settings.lunch_start },
    tarde: { start: settings.lunch_end, end: settings.work_end },
    noite: { start: '18:00', end: '23:00' },
    qualquer: { start: settings.work_start, end: settings.work_end },
  }
  const range = periodRanges[period] || periodRanges.qualquer
  const rangeStart = toMinutes(range.start)
  const rangeEnd = toMinutes(range.end)
  const lunchStart = toMinutes(settings.lunch_start)
  const lunchEnd = toMinutes(settings.lunch_end)
  const busy = busySlots.filter(s => s.end > rangeStart && s.start < rangeEnd).sort((a,b) => a.start-b.start)
  let cursor = rangeStart
  for (const slot of busy) {
    if (period === 'qualquer' && cursor < lunchEnd && cursor + durationMinutes > lunchStart) cursor = lunchEnd
    if (cursor + durationMinutes <= slot.start) return fromMinutes(cursor)
    cursor = Math.max(cursor, slot.end)
  }
  if (period === 'qualquer' && cursor < lunchEnd && cursor + durationMinutes > lunchStart) cursor = lunchEnd
  if (cursor + durationMinutes <= rangeEnd) return fromMinutes(cursor)
  return null
}

function detectarEvento(texto, settings) {
  const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const hoje = new Date().toISOString().slice(0, 10)

  const prompt = `Analise esta mensagem e determine se é um pedido para criar um evento no calendário.

Mensagem: "${texto}"

Hoje é ${new Date().toLocaleDateString('pt-BR')} (${hoje}). Amanhã: ${amanha}.
Horário de trabalho: ${settings.work_start}–${settings.work_end} | Almoço: ${settings.lunch_start}–${settings.lunch_end}

Se for um evento COM hora específica, responda:
{"evento": true, "smart": false, "title": "...", "start_datetime": "2026-04-09T14:00:00-03:00", "end_datetime": "2026-04-09T15:00:00-03:00", "description": ""}

Se for um evento SEM hora específica (ex: "de manhã", "à tarde", "primeiro horário livre"), responda:
{"evento": true, "smart": true, "title": "...", "date": "${amanha}", "period": "manha", "duration_minutes": 30, "description": ""}
Períodos válidos: manha, tarde, noite, qualquer

Se NÃO for evento, responda:
{"evento": false}

Regras:
- Use timezone -03:00 (Brasília)
- Se não tiver hora de fim, some a duração ou use 1h
- "amanhã" = ${amanha}, "hoje" = ${hoje}
- Quando pedir "de manhã" sem hora → smart: true, period: "manha"
- description pode ser vazio`

  try {
    const raw = callClaude(prompt, 30000)
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return { evento: false }
    return JSON.parse(match[0])
  } catch {
    return { evento: false }
  }
}

async function getProfile(chatId) {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('telegram_chat_id', String(chatId))
    .single()
  return data
}

// /start
bot.start(async (ctx) => {
  const nome = ctx.from?.first_name || 'você'
  await ctx.reply(
    `Oi, ${nome}! Sou a Anja, sua secretária executiva.\n\n` +
    `Me manda qualquer coisa — eventos, tarefas, dúvidas, rascunhos.\n\n` +
    `Exemplos:\n` +
    `• "reunião com Junior amanhã às 14h por 1h"\n` +
    `• "almoço com Diego sexta às 12h30"\n\n` +
    `/tarefas — tarefas pendentes\n` +
    `/limpar — limpa o histórico`
  )
})

// /id — mostra o chat id
bot.command('id', (ctx) => {
  ctx.reply(`Seu Chat ID: \`${ctx.chat.id}\`\n\nCole em Configurações → Telegram no app.`, { parse_mode: 'Markdown' })
})

// /tarefas
bot.command('tarefas', async (ctx) => {
  try {
    const profile = await getProfile(ctx.chat.id)
    if (!profile) {
      await ctx.reply('Conta não vinculada. Acesse o app Anja e cole seu Chat ID nas configurações.')
      return
    }
    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, status, priority, due_date')
      .eq('user_id', profile.id)
      .neq('status', 'feito')
      .order('created_at', { ascending: false })
      .limit(10)

    if (!tasks?.length) {
      await ctx.reply('Nenhuma tarefa pendente. ✅')
      return
    }
    const prioEmoji = { alta: '🔴', media: '🟡', baixa: '🟢' }
    const lines = tasks.map(t =>
      `${prioEmoji[t.priority] || '⚪'} ${t.title}${t.due_date ? ` — ${new Date(t.due_date).toLocaleDateString('pt-BR')}` : ''}`
    )
    await ctx.reply(`*Tarefas pendentes:*\n\n${lines.join('\n')}`, { parse_mode: 'Markdown' })
  } catch (err) {
    await ctx.reply('Erro ao buscar tarefas.')
    console.error(err)
  }
})

// /limpar
bot.command('limpar', (ctx) => {
  history[ctx.chat.id] = []
  ctx.reply('Histórico limpo. ✨')
})

// Mensagem livre
bot.on('text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return
  await ctx.sendChatAction('typing')

  const texto = ctx.message.text
  const profile = await getProfile(ctx.chat.id)
  const settings = profile ? await getUserSettings(profile.id) : { work_start: '08:00', work_end: '18:00', lunch_start: '12:00', lunch_end: '13:00', work_days: [1,2,3,4,5] }

  try {
    const deteccao = detectarEvento(texto, settings)

    if (deteccao.evento) {
      await ctx.sendChatAction('typing')

      try {
        let start_datetime, end_datetime, title

        if (deteccao.smart) {
          // Agendamento inteligente — encontra slot livre
          const busy = await getBusySlotsForDay(deteccao.date)
          const startTime = findFreeSlot(busy, deteccao.period, deteccao.duration_minutes, settings)

          if (!startTime) {
            const periodoNome = { manha: 'de manhã', tarde: 'à tarde', noite: 'à noite', qualquer: 'no dia' }
            await ctx.reply(`⚠️ Não encontrei um slot livre ${periodoNome[deteccao.period] || ''} em ${new Date(deteccao.date + 'T12:00:00').toLocaleDateString('pt-BR')}.`)
            return
          }

          const [h, m] = startTime.split(':').map(Number)
          const endMins = h * 60 + m + deteccao.duration_minutes
          const endTime = fromMinutes(endMins)
          start_datetime = `${deteccao.date}T${startTime}:00-03:00`
          end_datetime = `${deteccao.date}T${endTime}:00-03:00`
          title = deteccao.title
        } else {
          start_datetime = deteccao.start_datetime
          end_datetime = deteccao.end_datetime
          title = deteccao.title
        }

        const cal = getCalendarClient()
        const res = await cal.events.insert({
          calendarId: CALENDAR_ID,
          requestBody: {
            summary: title,
            description: deteccao.description || '',
            start: { dateTime: start_datetime, timeZone: 'America/Sao_Paulo' },
            end: { dateTime: end_datetime, timeZone: 'America/Sao_Paulo' },
          },
        })

        const start = new Date(start_datetime)
        await ctx.reply(
          `✅ *${title}* adicionado à agenda!\n` +
          `📅 ${start.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}\n\n` +
          `[Ver no Google Calendar](${res.data.htmlLink})`,
          { parse_mode: 'Markdown' }
        )
      } catch (err) {
        console.error('Erro ao criar evento:', err)
        await ctx.reply('⚠️ Não consegui criar o evento agora. Tenta de novo.')
      }
      return
    }

    const reply = chat(ctx.chat.id, texto)
    await ctx.reply(reply)

  } catch (err) {
    console.error('Erro:', err)
    await ctx.reply('Algo deu errado. Tenta de novo em instantes.')
  }
})

bot.launch()
console.log('🤖 Anja Bot — Online')
console.log(`Calendar: ${CALENDAR_ID}`)

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
