import { getServiceCalendarClient } from '@/lib/google/service-calendar'

export const revalidate = 60
import { ExternalLink } from 'lucide-react'
import { AgendaQuickCreate } from '@/components/agenda/quick-create'
import { AgendaRefreshButton } from '@/components/agenda/refresh-button'
import { AgendaWeekNav } from '@/components/agenda/week-nav'
import { Suspense } from 'react'

// ── Constantes ─────────────────────────────────────────────────────────────────
const HOURS      = Array.from({ length: 15 }, (_, i) => i + 7)  // 7h–21h
const HOUR_PX    = 64
const START_HOUR = 7
const WEEK_DAYS  = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MONTHS     = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

type CalEvent = {
  id: string; title: string; start: string; end: string
  htmlLink: string; allDay: boolean
}
type PositionedEvent = CalEvent & {
  top: number; height: number; col: number; totalCols: number
}

// ── Utils de data/hora ─────────────────────────────────────────────────────────
function getWeekDates(ref: Date) {
  const day = ref.getDay()
  const mon = new Date(ref)
  mon.setDate(ref.getDate() - ((day + 6) % 7))
  mon.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i); return d
  })
}

// Data YYYY-MM-DD no fuso SP — confiável via en-CA
function dateStrSP(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

// Minutos do dia no fuso SP
function minutesOfDaySP(iso: string) {
  const sp = new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  return sp.getHours() * 60 + sp.getMinutes()
}

function eventTop(start: string) {
  return (minutesOfDaySP(start) - START_HOUR * 60) * (HOUR_PX / 60)
}

function eventHeight(start: string, end: string) {
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / 60000
  return Math.max(diff * (HOUR_PX / 60), 24)
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

// ── Collision layout — por dia ─────────────────────────────────────────────────
function layoutDay(events: CalEvent[]): PositionedEvent[] {
  if (!events.length) return []
  const sorted = [...events].sort((a, b) =>
    new Date(a.start).getTime() - new Date(b.start).getTime()
  )
  const cols: number[] = []
  const colEnds: number[] = []
  for (let i = 0; i < sorted.length; i++) {
    const sMs = new Date(sorted[i].start).getTime()
    const eMs = new Date(sorted[i].end).getTime()
    let c = colEnds.findIndex(end => end <= sMs)
    if (c === -1) { c = colEnds.length; colEnds.push(eMs) }
    else colEnds[c] = eMs
    cols[i] = c
  }
  const totalCols = colEnds.length
  return sorted.map((e, i) => ({
    ...e,
    top: eventTop(e.start),
    height: eventHeight(e.start, e.end),
    col: cols[i],
    totalCols,
  }))
}

// ── Google Calendar ────────────────────────────────────────────────────────────
async function getWeekEvents(startDate: string, endDate: string): Promise<CalEvent[]> {
    try {
    const cal = getServiceCalendarClient()
    const res = await cal.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'stagemidia21@gmail.com',
      timeMin: new Date(`${startDate}T00:00:00-03:00`).toISOString(),
      timeMax: new Date(`${endDate}T23:59:59-03:00`).toISOString(),
      singleEvents: true, orderBy: 'startTime', maxResults: 100,
    })
    return (res.data.items ?? []).map(e => ({
      id:       e.id ?? '',
      title:    e.summary ?? '(sem título)',
      start:    e.start?.dateTime ?? e.start?.date ?? '',
      end:      e.end?.dateTime   ?? e.end?.date   ?? '',
      htmlLink: e.htmlLink ?? '',
      allDay:   !e.start?.dateTime,
    }))
  } catch (err) {
    console.error('[agenda] erro calendar:', err)
    return []
  }
}

// ── Cores estáveis por id — sólidas, legíveis, estilo Google Calendar ─────────
const PALETTES = [
  { bg: '#C8902A', hover: '#B07A20' },  // gold (brand)
  { bg: '#4A7C6F', hover: '#3A6458' },  // teal (brand)
  { bg: '#3A7EC8', hover: '#2B68AC' },  // azul
  { bg: '#8B48C8', hover: '#7538AA' },  // roxo
  { bg: '#C84040', hover: '#A83030' },  // vermelho
  { bg: '#2A8C50', hover: '#1E7040' },  // verde
  { bg: '#C86420', hover: '#A85018' },  // laranja
]
function palette(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return PALETTES[Math.abs(h) % PALETTES.length]
}

// ── Página ─────────────────────────────────────────────────────────────────────
export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { week?: string }
}) {
  const weekOffset = Math.max(-12, Math.min(12, parseInt(searchParams.week ?? '0') || 0))
  const today      = new Date()
  const reference  = new Date(today)
  reference.setDate(today.getDate() + weekOffset * 7)

  const weekDates  = getWeekDates(reference)
  const startDate  = weekDates[0].toISOString().slice(0, 10)
  const endDate    = weekDates[6].toISOString().slice(0, 10)
  const todayStr   = today.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const isCurrentWeek = weekOffset === 0
  const todayMinsSP   = isCurrentWeek
    ? minutesOfDaySP(today.toISOString())
    : -1

  const allEvents    = await getWeekEvents(startDate, endDate)
  const timedEvents  = allEvents.filter(e => !e.allDay)
  const allDayEvents = allEvents.filter(e => e.allDay)

  // Agrupa por dia e layout de colunas por dia
  const dayData = weekDates.map(d => {
    const ds = d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const dayEvents = timedEvents.filter(e => dateStrSP(e.start) === ds)
    return { ds, events: layoutDay(dayEvents) }
  })

  const weekLabel = isCurrentWeek ? null
    : weekOffset === 1 ? 'Próxima semana'
    : weekOffset === -1 ? 'Semana passada'
    : weekOffset > 0 ? `+${weekOffset} semanas`
    : `${weekOffset} semanas`

  const totalHeight = HOURS.length * HOUR_PX

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] -m-4 md:-m-6 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-char-3 shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-semibold text-cream">Agenda</h1>
              {weekLabel && (
                <span className="text-[10px] text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full">
                  {weekLabel}
                </span>
              )}
              <span className="text-xs text-muted hidden sm:block">
                {weekDates[0].getDate()} {MONTHS[weekDates[0].getMonth()]} –{' '}
                {weekDates[6].getDate()} {MONTHS[weekDates[6].getMonth()]}
              </span>
            </div>
          </div>
          <Suspense fallback={null}>
            <AgendaWeekNav weekOffset={weekOffset} />
          </Suspense>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden md:flex items-center gap-1.5 text-xs text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Google Calendar
          </span>
          <AgendaRefreshButton />
          <AgendaQuickCreate defaultDate={todayStr} />
        </div>
      </div>

      {/* Scroll */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-w-[600px]">

          {/* Coluna de horas — sticky */}
          <div className="w-14 shrink-0 sticky left-0 z-20 bg-charcoal border-r border-char-3/40">
            <div className="h-10" />
            {allDayEvents.length > 0 && <div style={{ height: 28 }} />}
            {HOURS.map(h => (
              <div key={h} style={{ height: HOUR_PX }}
                className="relative flex items-start justify-end pr-2.5 pt-0">
                <span className="text-[11px] text-muted/70 tabular-nums font-medium absolute -top-2.5 right-2.5">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Grade de 7 colunas */}
          <div className="flex-1 grid grid-cols-7">
            {weekDates.map((d, dayIdx) => {
              const ds = d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
              const isToday = ds === todayStr
              const { events: dayEvents } = dayData[dayIdx]
              const dayAllDay = allDayEvents.filter(e =>
                e.start === ds || e.start.startsWith(ds)
              )
              const todayTopPx = isCurrentWeek && isToday && todayMinsSP >= START_HOUR * 60
                ? (todayMinsSP - START_HOUR * 60) * (HOUR_PX / 60)
                : null

              return (
                <div key={ds} className={`flex flex-col border-r border-char-3/40 last:border-r-0 ${isToday ? 'bg-gold/[0.03]' : ''}`}>

                  {/* Header do dia */}
                  <div className={`h-10 flex flex-col items-center justify-center sticky top-0 z-10 border-b border-char-3/50 ${isToday ? 'bg-gold/[0.06]' : 'bg-charcoal'}`}>
                    <span className={`text-[9px] uppercase tracking-widest ${isToday ? 'text-gold/60' : 'text-muted/50'}`}>
                      {WEEK_DAYS[dayIdx]}
                    </span>
                    <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mt-0.5 ${
                      isToday ? 'bg-gold text-charcoal font-bold' : 'text-cream'
                    }`}>
                      {d.getDate()}
                    </span>
                  </div>

                  {/* All-day faixa */}
                  {allDayEvents.length > 0 && (
                    <div className="border-b border-char-3/30 flex flex-col gap-px px-0.5 py-0.5" style={{ height: 28, minHeight: 28 }}>
                      {dayAllDay.map(e => {
                        const p = palette(e.id)
                        return (
                          <div key={e.id}
                            className="text-[9px] truncate px-1 rounded leading-[14px] font-medium text-white"
                            style={{ background: p.bg }}>
                            {e.title}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Área horária — container independente por dia */}
                  <div className="relative flex-1" style={{ height: totalHeight }}>

                    {/* Grade de horas */}
                    {HOURS.map((_, hi) => (
                      <div key={hi}
                        className="absolute left-0 right-0 border-t border-char-3/50"
                        style={{ top: hi * HOUR_PX }} />
                    ))}

                    {/* Linha do horário atual */}
                    {todayTopPx !== null && (
                      <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                        style={{ top: todayTopPx }}>
                        <div className="w-2 h-2 rounded-full bg-gold shrink-0 -ml-1 shadow shadow-gold/50" />
                        <div className="flex-1 h-px bg-gold/60" />
                      </div>
                    )}

                    {/* Meio-hora: linhas tracejadas */}
                    {HOURS.map((_, hi) => (
                      <div key={`half-${hi}`}
                        className="absolute left-0 right-0 border-t border-char-3/10 border-dashed"
                        style={{ top: hi * HOUR_PX + HOUR_PX / 2 }} />
                    ))}

                    {/* Eventos do dia — posicionados dentro deste container */}
                    {dayEvents.map(event => {
                      const p = palette(event.id)
                      const GAP = 3
                      const colW  = `calc(${100 / event.totalCols}% - ${GAP + 1}px)`
                      const colL  = `calc(${(event.col / event.totalCols) * 100}% + ${GAP / 2}px)`
                      const tall  = event.height >= 52
                      const medium = event.height >= 32

                      return (
                        <a
                          key={event.id}
                          href={event.htmlLink || undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute rounded-md overflow-hidden group transition-all duration-100 hover:z-30"
                          style={{
                            top:    event.top + 1,
                            height: event.height - 2,
                            left:   colL,
                            width:  colW,
                            background: p.bg,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                            zIndex: 10 + event.col,
                          }}
                        >
                          <div className="px-1.5 py-1 h-full flex flex-col overflow-hidden">
                            <p className="font-semibold leading-tight truncate text-white"
                              style={{ fontSize: tall ? '11px' : '10px' }}>
                              {event.title}
                            </p>
                            {medium && (
                              <p className="tabular-nums leading-tight mt-0.5 text-white/80"
                                style={{ fontSize: '10px' }}>
                                {fmtTime(event.start)}
                                {tall && ` – ${fmtTime(event.end)}`}
                              </p>
                            )}
                          </div>
                          {event.htmlLink && (
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-80 transition-opacity">
                              <ExternalLink style={{ width: 9, height: 9, color: '#ffffff' }} />
                            </div>
                          )}
                        </a>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-char-3/50 px-4 md:px-6 py-2 flex items-center justify-between">
        <p className="text-[10px] text-muted/40">
          {allEvents.length} evento{allEvents.length !== 1 ? 's' : ''} · Google Calendar
        </p>
        <p className="text-[10px] text-muted/30 hidden sm:block">
          Crie eventos pelo chat com a Anja
        </p>
      </div>
    </div>
  )
}
