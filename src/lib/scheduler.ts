/**
 * Scheduler — encontra slots livres na agenda
 * Usa service account (não precisa de OAuth do usuário)
 */

import { google } from 'googleapis'

export type Period = 'manha' | 'tarde' | 'noite' | 'qualquer'

export type WorkSettings = {
  work_start: string   // "08:00"
  work_end: string     // "18:00"
  lunch_start: string  // "12:00"
  lunch_end: string    // "13:00"
  work_days: number[]  // [1,2,3,4,5]
}

export const DEFAULT_SETTINGS: WorkSettings = {
  work_start: '08:00',
  work_end: '18:00',
  lunch_start: '12:00',
  lunch_end: '13:00',
  work_days: [1, 2, 3, 4, 5],
}

// Período → faixa de horário
export function periodToRange(period: Period, settings: WorkSettings): { start: string; end: string } {
  const half = settings.lunch_start  // divisor manhã/tarde
  switch (period) {
    case 'manha':  return { start: settings.work_start, end: half }
    case 'tarde':  return { start: settings.lunch_end, end: settings.work_end }
    case 'noite':  return { start: '18:00', end: '23:00' }
    case 'qualquer': return { start: settings.work_start, end: settings.work_end }
  }
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function fromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
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

type BusySlot = { start: number; end: number }  // em minutos desde meia-noite

export async function getBusySlotsForDay(date: string): Promise<BusySlot[]> {
  const cal = getCalendarClient()
  const timeMin = new Date(`${date}T00:00:00-03:00`).toISOString()
  const timeMax = new Date(`${date}T23:59:59-03:00`).toISOString()

  const res = await cal.events.list({
    calendarId: CALENDAR_ID,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50,
  })

  return (res.data.items ?? [])
    .filter((e) => e.start?.dateTime)
    .map((e) => {
      const startDt = new Date(e.start!.dateTime!)
      const endDt = new Date(e.end!.dateTime!)
      const start = startDt.getHours() * 60 + startDt.getMinutes()
      const end = endDt.getHours() * 60 + endDt.getMinutes()
      return { start, end }
    })
    .sort((a, b) => a.start - b.start)
}

/**
 * Encontra o primeiro slot livre em um dia para uma duração específica dentro de um período.
 * nowMinutes: minutos desde meia-noite do horário atual — se passado, não agenda no passado.
 * Retorna o horário de início como string "HH:MM" ou null se não houver slot.
 */
export function findFreeSlot(
  busySlots: BusySlot[],
  period: Period,
  durationMinutes: number,
  settings: WorkSettings = DEFAULT_SETTINGS,
  nowMinutes?: number,
): string | null {
  const range = periodToRange(period, settings)
  const rangeStart = toMinutes(range.start)
  const rangeEnd = toMinutes(range.end)

  // Slots ocupados que se sobrepõem ao período
  const busy = busySlots
    .filter((s) => s.end > rangeStart && s.start < rangeEnd)
    .sort((a, b) => a.start - b.start)

  // Se é hoje, não agendar no passado — avança cursor pro momento atual + 5min de buffer
  const effectiveStart = nowMinutes != null
    ? Math.max(rangeStart, nowMinutes + 5)
    : rangeStart

  // Tenta encaixar o evento nos intervalos livres
  let cursor = effectiveStart

  for (const slot of busy) {
    // Pula almoço: se cursor cair no intervalo de almoço, avança
    const lunchStart = toMinutes(settings.lunch_start)
    const lunchEnd = toMinutes(settings.lunch_end)
    if (period === 'qualquer' && cursor < lunchEnd && cursor + durationMinutes > lunchStart) {
      cursor = lunchEnd
    }

    if (cursor + durationMinutes <= slot.start) {
      return fromMinutes(cursor)
    }
    cursor = Math.max(cursor, slot.end)
  }

  // Depois do último evento
  const lunchStart = toMinutes(settings.lunch_start)
  const lunchEnd = toMinutes(settings.lunch_end)
  if (period === 'qualquer' && cursor < lunchEnd && cursor + durationMinutes > lunchStart) {
    cursor = lunchEnd
  }

  if (cursor + durationMinutes <= rangeEnd) {
    return fromMinutes(cursor)
  }

  return null
}

/**
 * API completa: dado uma data, período e duração, retorna ISO strings para criar o evento.
 */
export async function findSmartSlot(
  date: string,
  period: Period,
  durationMinutes: number,
  settings: WorkSettings = DEFAULT_SETTINGS
): Promise<{ start_datetime: string; end_datetime: string } | null> {
  const busy = await getBusySlotsForDay(date)

  // Passa horário atual apenas se for hoje
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const isToday = date === todayStr
  let nowMinutes: number | undefined
  if (isToday) {
    const now = new Date()
    const h = now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' })
    const m = now.toLocaleString('en-US', { minute: 'numeric', timeZone: 'America/Sao_Paulo' })
    nowMinutes = parseInt(h) * 60 + parseInt(m)
  }

  const startTime = findFreeSlot(busy, period, durationMinutes, settings, nowMinutes)

  if (!startTime) return null

  const [startH, startM] = startTime.split(':').map(Number)
  const endMinutes = startH * 60 + startM + durationMinutes
  const endTime = fromMinutes(endMinutes)

  return {
    start_datetime: `${date}T${startTime}:00-03:00`,
    end_datetime: `${date}T${endTime}:00-03:00`,
  }
}
