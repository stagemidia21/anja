/**
 * Anja Notifier — bidirecional via Telegram
 *
 * - Recebe texto e áudio do usuário, interpreta com Claude e executa ações
 * - Envia lembretes 30min antes de cada evento
 * - Envia briefing diário às 8h
 *
 * Requer: TELEGRAM_BOT_TOKEN, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_KEY
 * Opcional: OPENAI_API_KEY (transcrição de áudio)
 *
 * PM2: pm2 start scripts/anja-notifier.mjs --name anja-notifier --interpreter node
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { execFileSync } from 'child_process'
import { google } from 'googleapis'
import * as path from 'path'
import { fileURLToPath } from 'url'

// ── Carrega .env.local ─────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env.local')

function loadEnv() {
  if (!existsSync(envPath)) return
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1')
    if (!process.env[key]) process.env[key] = val
  }
}
loadEnv()

const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'stagemidia21@gmail.com'
const STATE_FILE  = path.join(__dirname, '..', '.notifier-state.json')
const PROJECT_ROOT = path.join(__dirname, '..')

// ── Telegram helpers ───────────────────────────────────────────────────────────
async function tg(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function sendMessage(chatId, text, parseMode = 'HTML') {
  return tg('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
    disable_web_page_preview: true,
  })
}

async function getUpdates(offset = 0, timeout = 10) {
  const res = await tg('getUpdates', { offset, timeout, allowed_updates: ['message'] })
  return res.ok ? res.result : []
}

async function sendTyping(chatId) {
  await tg('sendChatAction', { chat_id: chatId, action: 'typing' })
}

// ── Estado persistido ──────────────────────────────────────────────────────────
function loadState() {
  if (!existsSync(STATE_FILE)) {
    return { chatId: null, notified: {}, lastBriefingDate: '', lastWeeklySummary: '', updateOffset: 0 }
  }
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'))
  } catch {
    return { chatId: null, notified: {}, lastBriefingDate: '', lastWeeklySummary: '', updateOffset: 0 }
  }
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

// ── Google Calendar ────────────────────────────────────────────────────────────
function getCalendarClient() {
  const SA_KEY = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').replace(/\\n/g, '\n')
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: SA_KEY,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
  return google.calendar({ version: 'v3', auth })
}

async function fetchTodayEvents() {
  try {
    const cal = getCalendarClient()
    const now = new Date()
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now);   todayEnd.setHours(23, 59, 59, 999)
    const res = await cal.events.list({
      calendarId: CALENDAR_ID,
      timeMin: todayStart.toISOString(),
      timeMax: todayEnd.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 20,
    })
    return (res.data.items ?? []).map(e => ({
      id:          e.id ?? '',
      title:       e.summary ?? '(sem título)',
      start:       e.start?.dateTime ?? e.start?.date ?? '',
      end:         e.end?.dateTime   ?? e.end?.date   ?? '',
      location:    e.location ?? '',
      description: e.description ?? '',
    }))
  } catch (err) {
    console.error('[calendar] erro:', err.message)
    return []
  }
}

async function fetchUpcomingEvents(days = 7) {
  try {
    const cal = getCalendarClient()
    const now = new Date()
    const until = new Date(now.getTime() + days * 86400000)
    const res = await cal.events.list({
      calendarId: CALENDAR_ID,
      timeMin: now.toISOString(),
      timeMax: until.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 30,
    })
    return (res.data.items ?? []).map(e => {
      const start = e.start?.dateTime ?? e.start?.date ?? ''
      const fmt = start.includes('T')
        ? new Date(start).toLocaleString('pt-BR', {
            weekday: 'short', day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
          })
        : new Date(start).toLocaleDateString('pt-BR', {
            weekday: 'short', day: '2-digit', month: '2-digit',
          })
      return `- ${e.summary ?? '(sem título)'}: ${fmt}`
    }).join('\n')
  } catch {
    return ''
  }
}

async function createCalendarEvent(title, startIso, endIso, description = '', colorId = '') {
  const cal = getCalendarClient()
  const res = await cal.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: title,
      description,
      start: { dateTime: startIso, timeZone: 'America/Sao_Paulo' },
      end:   { dateTime: endIso,   timeZone: 'America/Sao_Paulo' },
      ...(colorId ? { colorId: String(colorId) } : {}),
    },
  })
  return res.data
}

async function deleteCalendarEvent(titleQuery) {
  const cal = getCalendarClient()
  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 86400000)
  const list = await cal.events.list({
    calendarId: CALENDAR_ID,
    timeMin: new Date(now.getTime() - 7 * 86400000).toISOString(),
    timeMax: in30.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50,
    q: titleQuery,
  })
  const match = list.data.items?.[0]
  if (!match?.id) return null
  await cal.events.delete({ calendarId: CALENDAR_ID, eventId: match.id })
  return match.summary
}

async function updateCalendarEvent(titleQuery, startIso, endIso) {
  const cal = getCalendarClient()
  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 86400000)
  const list = await cal.events.list({
    calendarId: CALENDAR_ID,
    timeMin: new Date(now.getTime() - 7 * 86400000).toISOString(),
    timeMax: in30.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50,
    q: titleQuery,
  })
  const match = list.data.items?.[0]
  if (!match?.id) return null
  const duration = match.end?.dateTime && match.start?.dateTime
    ? new Date(match.end.dateTime).getTime() - new Date(match.start.dateTime).getTime()
    : 3600000
  const resolvedEnd = endIso ?? new Date(new Date(startIso).getTime() + duration).toISOString()
  const res = await cal.events.patch({
    calendarId: CALENDAR_ID,
    eventId: match.id,
    requestBody: {
      start: { dateTime: startIso, timeZone: 'America/Sao_Paulo' },
      end:   { dateTime: resolvedEnd, timeZone: 'America/Sao_Paulo' },
    },
  })
  return { summary: match.summary, htmlLink: res.data.htmlLink }
}

// ── Supabase — buscar tarefas e rotinas ───────────────────────────────────────
async function fetchPendingTasks(userId) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || !userId) return []
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const res = await fetch(
      `${url}/rest/v1/tasks?user_id=eq.${userId}&status=neq.feito&order=priority.desc,due_date.asc&limit=10`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    )
    return res.ok ? (await res.json()) : []
  } catch { return [] }
}

async function fetchTodayRoutines(userId) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || !userId) return []
  try {
    const res = await fetch(
      `${url}/rest/v1/routines?user_id=eq.${userId}&active=eq.true&order=start_time`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    )
    if (!res.ok) return []
    const all = await res.json()
    const todayIdx = new Date().getDay()
    return all.filter(r => r.days_of_week.includes(todayIdx))
  } catch { return [] }
}

// ── Supabase — criar tarefa ────────────────────────────────────────────────────
async function createTask(title, priority = 'media', dueDate = null, userId) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || !userId) throw new Error('Supabase não configurado')

  const body = { user_id: userId, title, priority, status: 'fazer' }
  if (dueDate) body.due_date = dueDate

  const res = await fetch(`${url}/rest/v1/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json())[0]
}

async function completeTask(titleOrId, userId) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || !userId) throw new Error('Supabase não configurado')

  // Tenta por id direto, senão busca por título (ilike)
  let taskId = titleOrId
  if (!titleOrId.includes('-')) {
    // Não parece UUID — busca por título
    const res = await fetch(
      `${url}/rest/v1/tasks?user_id=eq.${userId}&title=ilike.*${encodeURIComponent(titleOrId)}*&status=neq.feito&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    )
    const rows = res.ok ? await res.json() : []
    if (!rows.length) return null
    taskId = rows[0].id
  }

  const res = await fetch(`${url}/rest/v1/tasks?id=eq.${taskId}&user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ status: 'feito' }),
  })
  if (!res.ok) throw new Error(await res.text())
  const rows = await res.json()
  return rows[0] ?? null
}

async function completeRoutine(titleOrId, userId) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || !userId) throw new Error('Supabase não configurado')
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

  // Busca rotina por título
  const res = await fetch(
    `${url}/rest/v1/routines?user_id=eq.${userId}&title=ilike.*${encodeURIComponent(titleOrId)}*&active=eq.true&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  const rows = res.ok ? await res.json() : []
  if (!rows.length) return null
  const routine = rows[0]

  // Upsert em routine_completions
  const ins = await fetch(`${url}/rest/v1/routine_completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'resolution=ignore-duplicates',
    },
    body: JSON.stringify({ routine_id: routine.id, user_id: userId, completed_date: today }),
  })
  if (!ins.ok) throw new Error(await ins.text())
  return routine.title
}

async function resolveUserId(state) {
  if (state.userId) return state.userId
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try {
    // Pega o primeiro usuário (ambiente single-user)
    const res = await fetch(`${url}/auth/v1/admin/users?per_page=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    const json = await res.json()
    const id = json.users?.[0]?.id ?? null
    if (id) { state.userId = id; saveState(state) }
    return id
  } catch {
    return null
  }
}

// ── Transcrição de áudio (OpenAI Whisper) ─────────────────────────────────────
async function transcribeAudio(fileId) {
  if (!process.env.OPENAI_API_KEY) return null
  try {
    // 1. Obtem caminho do arquivo no Telegram
    const fileInfo = await tg('getFile', { file_id: fileId })
    if (!fileInfo.ok) return null
    const filePath = fileInfo.result.file_path

    // 2. Baixa o arquivo
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`
    const audioRes = await fetch(fileUrl)
    const audioBuffer = await audioRes.arrayBuffer()

    // 3. Envia para Whisper
    const form = new FormData()
    form.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }), 'audio.ogg')
    form.append('model', 'whisper-1')
    form.append('language', 'pt')

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    })
    const json = await whisperRes.json()
    return json.text ?? null
  } catch (err) {
    console.error('[whisper] erro:', err.message)
    return null
  }
}

// ── Processamento com Claude ───────────────────────────────────────────────────
function callClaude(prompt) {
  return execFileSync('claude', ['-p', prompt], {
    cwd: PROJECT_ROOT,
    timeout: 45000,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 5,
  }).trim()
}

async function processUserMessage(text, userId) {
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
  const hojeISO  = new Date().toISOString().slice(0, 10)
  const amanhaISO = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const [agenda, tasks] = await Promise.all([
    fetchUpcomingEvents(7),
    userId ? fetchPendingTasks(userId) : Promise.resolve([]),
  ])

  const tasksContext = tasks.length > 0
    ? '\n\nTAREFAS PENDENTES:\n' + tasks.map(t => {
        const prio = t.priority === 'alta' ? '🔴' : t.priority === 'media' ? '🟡' : '⚪'
        const due = t.due_date ? ` (prazo: ${t.due_date})` : ''
        return `• ${prio} ${t.title}${due}`
      }).join('\n')
    : ''

  const prompt = `Você é a Anja, secretária executiva do Homero. Responda em português BR, direto ao ponto.
Hoje é ${hoje} (${hojeISO}). Amanhã: ${amanhaISO}. Fuso: America/Sao_Paulo.

AGENDA PRÓXIMOS 7 DIAS:
${agenda || '(sem eventos)'}${tasksContext}

Se o usuário pedir para criar um evento com hora definida, coloque no FINAL:
[ACTION:CREATE_EVENT]{"title":"...","start_datetime":"${hojeISO}T14:00:00-03:00","end_datetime":"${hojeISO}T15:00:00-03:00","description":""}[/ACTION]

Se pedir para excluir um evento:
[ACTION:DELETE_EVENT]{"title":"..."}[/ACTION]

Se pedir para reagendar/mover um evento:
[ACTION:UPDATE_EVENT]{"title":"...","start_datetime":"${hojeISO}T14:00:00-03:00","end_datetime":"${hojeISO}T15:00:00-03:00"}[/ACTION]

Se pedir para criar uma tarefa (algo a fazer, sem hora definida):
[ACTION:CREATE_TASK]{"title":"...","priority":"alta","due_date":"${amanhaISO}"}[/ACTION]
priority: alta, media ou baixa. due_date é opcional.

Se pedir para concluir/marcar uma tarefa como feita:
[ACTION:COMPLETE_TASK]{"title":"..."}[/ACTION]
Use o título exato ou parte dele. Nunca invente uma tarefa — só complete se o usuário mencionou explicitamente.

Se pedir para ver tarefas pendentes / lista de tarefas:
[ACTION:LIST_TASKS]{}[/ACTION]

Se pedir para concluir/marcar uma rotina como feita hoje:
[ACTION:COMPLETE_ROUTINE]{"title":"..."}[/ACTION]

Regras:
- Bloco [ACTION] sempre no final, nenhum texto depois
- Sem pedido de ação → sem bloco
- Evento = tem hora marcada. Tarefa = algo a fazer/lembrar sem hora
- Para eventos sem hora exata, escolha um horário razoável dentro do expediente (8h-18h)
- Resposta curta para Telegram, sem markdown pesado, sem asteriscos duplos

Mensagem do usuário: "${text}"`

  return callClaude(prompt)
}

// ── Processa incoming messages ─────────────────────────────────────────────────
async function handleIncomingMessages(state) {
  let updates
  try {
    updates = await getUpdates(state.updateOffset || 0, 0)
  } catch {
    return
  }
  if (!updates.length) return

  for (const update of updates) {
    state.updateOffset = update.update_id + 1
    const msg = update.message
    if (!msg) continue

    // Ignora mensagens de outros chats
    if (state.chatId && String(msg.chat.id) !== String(state.chatId)) continue

    let text = msg.text

    // Mensagem de voz ou áudio
    if (msg.voice || msg.audio) {
      const fileId = msg.voice?.file_id || msg.audio?.file_id
      if (!process.env.OPENAI_API_KEY) {
        await sendMessage(state.chatId,
          '🎙️ Recebi seu áudio, mas <b>OPENAI_API_KEY</b> não está configurada.\n\nAdicione ao <code>.env.local</code> para transcrição automática.\n\nEnquanto isso, manda por texto.')
        continue
      }
      await sendTyping(state.chatId)
      text = await transcribeAudio(fileId)
      if (!text) {
        await sendMessage(state.chatId, '⚠️ Não consegui transcrever o áudio. Tenta por texto.')
        continue
      }
      console.log(`[telegram] áudio transcrito: "${text}"`)
      // Confirma transcrição
      await sendMessage(state.chatId, `🎙️ <i>${text}</i>`)
    }

    if (!text) continue

    // Resolve userId na primeira mensagem
    if (!state.userId) await resolveUserId(state)

    // Processa com Claude
    try {
      await sendTyping(state.chatId)
      const raw = await processUserMessage(text, state.userId)

      const actionMatch = raw.match(/\[ACTION:([A-Z_]+)\]([\s\S]*?)\[\/ACTION\]/)
      let reply = raw.replace(/\[ACTION:[\s\S]*?\[\/ACTION\]/g, '').trim()

      if (actionMatch) {
        const actionType = actionMatch[1]
        const actionData = JSON.parse(actionMatch[2])

        if (actionType === 'CREATE_EVENT') {
          try {
            const ev = await createCalendarEvent(
              actionData.title,
              actionData.start_datetime,
              actionData.end_datetime,
              actionData.description || '',
            )
            const hora = new Date(actionData.start_datetime).toLocaleString('pt-BR', {
              weekday: 'short', day: '2-digit', month: '2-digit',
              hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
            })
            reply += `\n\n✅ <b>${actionData.title}</b> marcado para ${hora}`
            if (ev.htmlLink) reply += `\n<a href="${ev.htmlLink}">Ver no Google Calendar</a>`
          } catch (err) {
            reply += `\n\n⚠️ Não consegui criar o evento: ${err.message}`
          }

        } else if (actionType === 'DELETE_EVENT') {
          try {
            const deleted = await deleteCalendarEvent(actionData.title)
            if (deleted) {
              reply += `\n\n🗑️ <b>${deleted}</b> removido da agenda.`
            } else {
              reply += `\n\n⚠️ Não encontrei "${actionData.title}" na agenda.`
            }
          } catch (err) {
            reply += `\n\n⚠️ Erro ao excluir: ${err.message}`
          }

        } else if (actionType === 'CREATE_TASK') {
          try {
            await createTask(
              actionData.title,
              actionData.priority || 'media',
              actionData.due_date || null,
              state.userId,
            )
            const due = actionData.due_date ? ` · prazo ${actionData.due_date}` : ''
            reply += `\n\n📋 Tarefa criada: <b>${actionData.title}</b>${due}`
          } catch (err) {
            reply += `\n\n⚠️ Não consegui criar a tarefa: ${err.message}`
          }

        } else if (actionType === 'UPDATE_EVENT') {
          try {
            const updated = await updateCalendarEvent(
              actionData.title,
              actionData.start_datetime,
              actionData.end_datetime,
            )
            if (updated) {
              const hora = new Date(actionData.start_datetime).toLocaleString('pt-BR', {
                weekday: 'short', day: '2-digit', month: '2-digit',
                hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
              })
              reply += `\n\n✅ <b>${updated.summary}</b> reagendado para ${hora}`
              if (updated.htmlLink) reply += `\n<a href="${updated.htmlLink}">Ver</a>`
            } else {
              reply += `\n\n⚠️ Não encontrei "${actionData.title}" para reagendar.`
            }
          } catch (err) {
            reply += `\n\n⚠️ Erro ao reagendar: ${err.message}`
          }

        } else if (actionType === 'COMPLETE_TASK') {
          try {
            const done = await completeTask(actionData.title, state.userId)
            if (done) {
              reply += `\n\n✅ Tarefa concluída: <b>${done.title}</b>`
            } else {
              reply += `\n\n⚠️ Não encontrei a tarefa "${actionData.title}".`
            }
          } catch (err) {
            reply += `\n\n⚠️ Erro ao concluir tarefa: ${err.message}`
          }

        } else if (actionType === 'LIST_TASKS') {
          try {
            const tasks = await fetchPendingTasks(state.userId)
            if (tasks.length === 0) {
              reply += '\n\n✅ Nenhuma tarefa pendente.'
            } else {
              const lines = tasks.map(t => {
                const prio = t.priority === 'alta' ? '🔴' : t.priority === 'media' ? '🟡' : '⚪'
                const due = t.due_date ? ` · ${t.due_date}` : ''
                return `${prio} ${t.title}${due}`
              }).join('\n')
              reply = `📋 <b>Tarefas pendentes:</b>\n${lines}`
            }
          } catch (err) {
            reply += `\n\n⚠️ Erro ao buscar tarefas: ${err.message}`
          }

        } else if (actionType === 'COMPLETE_ROUTINE') {
          try {
            const done = await completeRoutine(actionData.title, state.userId)
            if (done) {
              reply += `\n\n✅ Rotina concluída hoje: <b>${done}</b>`
            } else {
              reply += `\n\n⚠️ Não encontrei a rotina "${actionData.title}".`
            }
          } catch (err) {
            reply += `\n\n⚠️ Erro ao concluir rotina: ${err.message}`
          }
        }
      }

      if (reply) await sendMessage(state.chatId, reply)
    } catch (err) {
      console.error('[handle] erro ao processar mensagem:', err.message)
      await sendMessage(state.chatId, '⚠️ Algo deu errado. Tenta de novo.')
    }
  }

  saveState(state)
}

// ── Formatadores de notificação ────────────────────────────────────────────────
function formatTime(iso) {
  if (!iso.includes('T')) return 'dia todo'
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

async function buildBriefing(events, userId) {
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo',
  })
  const todayCapital = today.charAt(0).toUpperCase() + today.slice(1)
  const parts = [`🌅 <b>Bom dia.</b>\n\n${todayCapital}`]

  // Agenda
  if (events.length === 0) {
    parts.push('\n📅 Sem eventos na agenda hoje.')
  } else {
    const lines = events.map(e => {
      const time = formatTime(e.start)
      return `• <b>${e.title}</b> — ${time}${e.location ? ` (${e.location})` : ''}`
    })
    parts.push(`\n📅 <b>${events.length} evento${events.length > 1 ? 's' : ''} hoje:</b>\n${lines.join('\n')}`)
  }

  // Tarefas pendentes
  if (userId) {
    const tasks = await fetchPendingTasks(userId)
    if (tasks.length > 0) {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      const taskLines = tasks.slice(0, 5).map(t => {
        const prio = t.priority === 'alta' ? '🔴' : t.priority === 'media' ? '🟡' : '⚪'
        const atrasada = t.due_date && t.due_date < today ? ' ⚠️ atrasada' : ''
        return `• ${prio} ${t.title}${atrasada}`
      })
      parts.push(`\n✅ <b>${tasks.length} tarefa${tasks.length > 1 ? 's' : ''} pendente${tasks.length > 1 ? 's' : ''}:</b>\n${taskLines.join('\n')}`)
    }

    // Rotinas do dia
    const rotinas = await fetchTodayRoutines(userId)
    if (rotinas.length > 0) {
      const totalMin = rotinas.reduce((a, r) => a + r.duration_minutes, 0)
      const rotinaLines = rotinas.map(r => `• ${r.start_time} — ${r.title} (${r.duration_minutes}min)`)
      parts.push(`\n🔄 <b>${rotinas.length} rotina${rotinas.length > 1 ? 's' : ''} hoje (${totalMin}min):</b>\n${rotinaLines.join('\n')}`)
    }
  }

  if (events.length > 0) parts.push('\n<i>Vou avisar 30 minutos antes de cada evento.</i>')
  return parts.join('')
}

function buildReminder(event) {
  const time = formatTime(event.start)
  return `⏰ <b>Daqui 30 minutos</b>\n\n<b>${event.title}</b>\n🕐 ${time}${event.location ? `\n📍 ${event.location}` : ''}${event.description ? `\n\n<i>${event.description.slice(0, 200)}</i>` : ''}`
}

// ── Setup: descobrir chat ID ───────────────────────────────────────────────────

// ── Resumo semanal ─────────────────────────────────────────────────────────────
async function buildWeeklySummary(userId) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey || !userId) return null

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)
  const weekAgoISO = weekAgo.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const todayISO = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

  const headers = {
    'apikey': supabaseKey,
    'Authorization': 'Bearer ' + supabaseKey,
    'Content-Type': 'application/json',
  }

  const [compRes, routinesRes, tasksRes] = await Promise.all([
    fetch(supabaseUrl + '/rest/v1/routine_completions?user_id=eq.' + userId +
      '&completed_date=gte.' + weekAgoISO + '&completed_date=lte.' + todayISO +
      '&select=routine_id,completed_date', { headers }),
    fetch(supabaseUrl + '/rest/v1/routines?user_id=eq.' + userId +
      '&active=eq.true&select=id,title,days_of_week', { headers }),
    fetch(supabaseUrl + '/rest/v1/tasks?user_id=eq.' + userId +
      '&status=eq.feito&updated_at=gte.' + weekAgoISO + 'T00:00:00Z' +
      '&select=title,priority', { headers }),
  ])

  const completions = compRes.ok ? await compRes.json() : []
  const routines = routinesRes.ok ? await routinesRes.json() : []
  const doneTasks = tasksRes.ok ? await tasksRes.json() : []

  // Conta rotinas esperadas nos últimos 7 dias
  let expected = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekAgo.getTime() + i * 86400000)
    expected += routines.filter(r => r.days_of_week.includes(d.getDay())).length
  }
  const completedRoutines = completions.length
  const pct = expected > 0 ? Math.round((completedRoutines / expected) * 100) : 0
  const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '✅' : pct >= 40 ? '📊' : '💪'

  const lines = [
    emoji + ' <b>Resumo da semana</b>',
    '',
    '<b>Rotinas:</b> ' + completedRoutines + '/' + expected + ' (' + pct + '%)',
    '<b>Tarefas concluídas:</b> ' + doneTasks.length,
  ]

  const alta = doneTasks.filter(t => t.priority === 'alta')
  if (alta.length > 0) lines.push('• Alta prioridade: ' + alta.map(t => t.title).join(', '))

  if (pct >= 80) lines.push('', 'Semana excelente! Continue assim. 🔥')
  else if (pct >= 60) lines.push('', 'Boa semana! Pequenos ajustes e você chega lá.')
  else lines.push('', 'Nova semana, nova chance de acertar a rotina. 💪')

  return lines.join('\n')
}

async function discoverChatId(state) {
  console.log('\n📱 TELEGRAM_CHAT_ID não configurado.')
  console.log('   Mande qualquer mensagem para o bot no Telegram e aguarde...\n')
  let offset = 0
  while (!state.chatId) {
    const updates = await getUpdates(offset)
    for (const u of updates) {
      offset = u.update_id + 1
      const msg = u.message
      if (msg?.chat?.id) {
        state.chatId = String(msg.chat.id)
        state.updateOffset = offset
        saveState(state)
        await sendMessage(state.chatId,
          '✅ <b>Anja conectada!</b>\n\nPode me mandar mensagens de voz ou texto. Eu crio eventos, gerencio sua agenda e aviso 30min antes de cada compromisso.')
        console.log(`✅ Chat ID: ${state.chatId}`)
        return
      }
    }
    await sleep(3000)
  }
}

// ── Loop de lembretes (tick a cada 60s) ───────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function tick(state) {
  const now = new Date()
  const nowMs = now.getTime()
  const todayISO = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const hour = parseInt(now.toLocaleTimeString('pt-BR', { hour: '2-digit', timeZone: 'America/Sao_Paulo' }))
  const minute = parseInt(now.toLocaleTimeString('pt-BR', { minute: '2-digit', timeZone: 'America/Sao_Paulo' }))

  const events = await fetchTodayEvents()


  // Resumo semanal — domingo às 20h
  const dayOfWeek = now.getDay()
  const weekKey = todayISO + '-weekly'
  if (dayOfWeek === 0 && hour === 20 && minute <= 1 && state.lastWeeklySummary !== weekKey && state.chatId && state.userId) {
    try {
      const summary = await buildWeeklySummary(state.userId)
      if (summary) {
        await sendMessage(state.chatId, summary)
        state.lastWeeklySummary = weekKey
        saveState(state)
        console.log('[notifier] resumo semanal enviado')
      }
    } catch (e) { console.error('[notifier] erro resumo semanal:', e.message) }
  }

  // Briefing diário às 8h (±1 min)
  if (hour === 8 && minute <= 1 && state.lastBriefingDate !== todayISO) {
    await sendMessage(state.chatId, await buildBriefing(events, state.userId || null))
    state.lastBriefingDate = todayISO
    saveState(state)
    console.log(`[${now.toLocaleTimeString('pt-BR')}] briefing enviado`)
  }

  // Lembretes 30min antes
  for (const event of events) {
    if (!event.start.includes('T')) continue
    const startMs = new Date(event.start).getTime()
    const diffMin = (startMs - nowMs) / 60000
    if (diffMin >= 28 && diffMin <= 32 && !state.notified[event.id]) {
      await sendMessage(state.chatId, buildReminder(event))
      state.notified[event.id] = true
      saveState(state)
      console.log(`[${now.toLocaleTimeString('pt-BR')}] lembrete: ${event.title}`)
    }
  }

  // Limpa notified de dias anteriores
  const todayIds = new Set(events.map(e => e.id))
  for (const id of Object.keys(state.notified)) {
    if (!todayIds.has(id)) delete state.notified[id]
  }
}

// ── Entrypoint ─────────────────────────────────────────────────────────────────
async function main() {
  if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN não encontrado no .env.local')
    process.exit(1)
  }

  const state = loadState()
  console.log('🤖 Anja Notifier iniciando...')

  if (!state.chatId) {
    await discoverChatId(state)
  } else {
    console.log(`✅ Chat ID: ${state.chatId}`)
  }

  const hasWhisper = !!process.env.OPENAI_API_KEY
  console.log(`🎙️  Transcrição de áudio: ${hasWhisper ? 'ativa (Whisper)' : 'inativa (sem OPENAI_API_KEY)'}`)
  console.log('⏱  Loop ativo\n')

  // Loop de mensagens recebidas — a cada 3s
  setInterval(() => handleIncomingMessages(state), 3000)

  // Loop de lembretes/briefing — a cada 60s
  await tick(state)
  setInterval(() => tick(state), 60 * 1000)
}

main().catch(err => {
  console.error('❌ Erro fatal:', err)
  process.exit(1)
})
