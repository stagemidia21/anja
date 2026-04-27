'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import {
  Clock, Plus, Trash2, Check, RefreshCw, Pencil, Zap, X,
  ChevronDown, CalendarPlus, CalendarCheck, CalendarX,
  Sun, Briefcase, Dumbbell, Moon, Sparkles,
} from 'lucide-react'

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const RRULE_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
const WORK_DAYS = [1, 2, 3, 4, 5]

// ── Templates por categoria ───────────────────────────────────────────────────
type Template = { title: string; start_time: string; duration_minutes: number; days_of_week: number[] }
type Category = { id: string; label: string; icon: React.ElementType; color: string; templates: Template[] }

const CATEGORIES: Category[] = [
  {
    id: 'manha',
    label: 'Manhã',
    icon: Sun,
    color: 'text-amber-400',
    templates: [
      { title: 'Café da manhã',     start_time: '07:00', duration_minutes: 20, days_of_week: ALL_DAYS },
      { title: 'Meditação',         start_time: '07:30', duration_minutes: 15, days_of_week: ALL_DAYS },
      { title: 'Leitura matinal',   start_time: '07:50', duration_minutes: 20, days_of_week: ALL_DAYS },
      { title: 'Exercício em casa', start_time: '06:30', duration_minutes: 30, days_of_week: ALL_DAYS },
      { title: 'Academia',          start_time: '06:00', duration_minutes: 60, days_of_week: [1, 3, 5] },
      { title: 'Corrida',           start_time: '06:30', duration_minutes: 40, days_of_week: [2, 4, 6] },
    ],
  },
  {
    id: 'trabalho',
    label: 'Trabalho',
    icon: Briefcase,
    color: 'text-blue-400',
    templates: [
      { title: 'Planejamento do dia',   start_time: '08:30', duration_minutes: 20, days_of_week: WORK_DAYS },
      { title: 'Check de métricas',     start_time: '09:00', duration_minutes: 30, days_of_week: WORK_DAYS },
      { title: 'Bloco de foco',         start_time: '09:30', duration_minutes: 90, days_of_week: WORK_DAYS },
      { title: 'Almoço',               start_time: '12:00', duration_minutes: 60, days_of_week: WORK_DAYS },
      { title: 'Revisão de e-mails',   start_time: '14:00', duration_minutes: 30, days_of_week: WORK_DAYS },
      { title: 'Reunião de equipe',     start_time: '09:00', duration_minutes: 60, days_of_week: [1] },
      { title: 'Revisão de tarefas',   start_time: '17:30', duration_minutes: 20, days_of_week: WORK_DAYS },
      { title: 'Relatórios semanais',  start_time: '10:00', duration_minutes: 60, days_of_week: [5] },
      { title: 'Prospecção',           start_time: '10:00', duration_minutes: 60, days_of_week: [2, 4] },
    ],
  },
  {
    id: 'saude',
    label: 'Saúde',
    icon: Dumbbell,
    color: 'text-green-400',
    templates: [
      { title: 'Café da tarde',  start_time: '15:30', duration_minutes: 15, days_of_week: ALL_DAYS },
      { title: 'Alongamento',   start_time: '13:00', duration_minutes: 10, days_of_week: WORK_DAYS },
      { title: 'Caminhada',     start_time: '18:30', duration_minutes: 30, days_of_week: [1, 3, 5] },
      { title: 'Hidratação',    start_time: '10:00', duration_minutes: 5,  days_of_week: ALL_DAYS },
      { title: 'Jantar',        start_time: '19:30', duration_minutes: 40, days_of_week: ALL_DAYS },
    ],
  },
  {
    id: 'noite',
    label: 'Noite',
    icon: Moon,
    color: 'text-purple-400',
    templates: [
      { title: 'Leitura',           start_time: '21:00', duration_minutes: 30, days_of_week: ALL_DAYS },
      { title: 'Revisão do dia',    start_time: '22:00', duration_minutes: 15, days_of_week: ALL_DAYS },
      { title: 'Journaling',        start_time: '21:30', duration_minutes: 15, days_of_week: ALL_DAYS },
      { title: 'Modo offline',      start_time: '22:00', duration_minutes: 60, days_of_week: ALL_DAYS },
      { title: 'Estudo / Curso',    start_time: '20:00', duration_minutes: 60, days_of_week: [1, 3] },
      { title: 'Séries / Descanso', start_time: '21:00', duration_minutes: 90, days_of_week: [5, 6] },
    ],
  },
]

const ALL_TEMPLATES = CATEGORIES.flatMap(c => c.templates)

// ── Types ─────────────────────────────────────────────────────────────────────
type Routine = {
  id?: string
  title: string
  days_of_week: number[]
  start_time: string
  duration_minutes: number
  active: boolean
  gcal_event_id?: string | null
}

const EMPTY_ROUTINE: Routine = { title: '', days_of_week: WORK_DAYS, start_time: '09:00', duration_minutes: 30, active: true }

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

function nextOccurrence(daysOfWeek: number[], timeStr: string, durationMinutes: number) {
  if (!daysOfWeek.length) return null
  const [h, m] = timeStr.split(':').map(Number)
  const base = new Date(); base.setHours(h, m, 0, 0)
  for (let offset = 0; offset < 7; offset++) {
    const c = new Date(base); c.setDate(base.getDate() + offset)
    if (daysOfWeek.includes(c.getDay())) {
      if (offset === 0 && c.getTime() <= Date.now()) continue
      return { start: c.toISOString(), end: new Date(c.getTime() + durationMinutes * 60000).toISOString() }
    }
  }
  const first = daysOfWeek[0]
  const t = new Date(); t.setHours(h, m, 0, 0)
  t.setDate(t.getDate() + ((first - t.getDay() + 7) % 7 || 7))
  return { start: t.toISOString(), end: new Date(t.getTime() + durationMinutes * 60000).toISOString() }
}

function daysLabel(days: number[]) {
  if (days.length === 7) return 'Todo dia'
  if (days.length === 5 && WORK_DAYS.every(d => days.includes(d))) return 'Seg–Sex'
  return days.map(d => DAYS[d]).join(', ')
}

// ── Day Picker ────────────────────────────────────────────────────────────────
function DayPicker({ selected, onChange }: { selected: number[]; onChange: (d: number[]) => void }) {
  const isAll = selected.length === 7
  const isWork = selected.length === 5 && WORK_DAYS.every(d => selected.includes(d))
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <button type="button" onClick={() => onChange(isAll ? [] : [...ALL_DAYS])}
          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${isAll ? 'bg-gold/15 border-gold/40 text-gold' : 'border-char-3 text-muted hover:border-gold/30 hover:text-cream'}`}>
          Todo dia
        </button>
        <button type="button" onClick={() => onChange(isWork ? [] : [...WORK_DAYS])}
          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${isWork ? 'bg-gold/15 border-gold/40 text-gold' : 'border-char-3 text-muted hover:border-gold/30 hover:text-cream'}`}>
          Seg–Sex
        </button>
      </div>
      <div className="flex gap-1.5">
        {DAYS.map((d, i) => (
          <button key={i} type="button"
            onClick={() => onChange(selected.includes(i) ? selected.filter(x => x !== i) : [...selected, i].sort())}
            className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors flex-1 ${selected.includes(i) ? 'bg-gold text-charcoal' : 'bg-charcoal border border-char-3 text-muted hover:border-gold/40 hover:text-cream'}`}>
            {d}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Modal de formulário ────────────────────────────────────────────────────────
function RoutineModal({ routine, onSave, onClose, onAddToCalendar, onRemoveFromCalendar, title }: {
  routine: Routine
  onSave: (r: Routine) => Promise<void>
  onClose: () => void
  onAddToCalendar?: (r: Routine) => Promise<string | null>
  onRemoveFromCalendar?: (eventId: string) => Promise<void>
  title: string
}) {
  const [form, setForm] = useState<Routine>({ ...routine })
  const [saving, setSaving] = useState(false)
  const [calState, setCalState] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle')

  const isSynced = !!form.gcal_event_id

  async function handleSave() {
    if (!form.title.trim() || !form.days_of_week.length) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  async function handleAddToCalendar() {
    if (!onAddToCalendar) return
    setCalState('syncing')
    const id = await onAddToCalendar(form)
    if (id) { setForm(f => ({ ...f, gcal_event_id: id })); setCalState('done'); setTimeout(() => setCalState('idle'), 3000) }
    else { setCalState('error'); setTimeout(() => setCalState('idle'), 3000) }
  }

  async function handleRemoveFromCalendar() {
    if (!onRemoveFromCalendar || !form.gcal_event_id) return
    setCalState('syncing')
    await onRemoveFromCalendar(form.gcal_event_id)
    setForm(f => ({ ...f, gcal_event_id: null }))
    setCalState('idle')
  }

  const inputCls = "w-full bg-charcoal border border-char-3 rounded-lg px-3 py-2.5 text-sm text-cream focus:outline-none focus:border-gold/50 placeholder:text-muted transition-colors"

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-char-2 border border-char-3 rounded-2xl w-full max-w-md shadow-2xl fade-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-char-3">
          <h3 className="text-sm font-semibold text-cream">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-cream transition-colors p-1"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted mb-1 block">Nome</label>
            <input autoFocus type="text" placeholder="Ex: Meditação, Academia..." value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block">Horário</label>
              <input type="time" value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Duração (min)</label>
              <input type="number" min="5" max="480" step="5" value={form.duration_minutes}
                onChange={e => setForm(f => ({ ...f, duration_minutes: Math.max(5, Number(e.target.value)) }))}
                className={inputCls} />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted mb-2 block">Dias da semana</label>
            <DayPicker selected={form.days_of_week} onChange={days => setForm(f => ({ ...f, days_of_week: days }))} />
          </div>

          {/* Google Calendar */}
          <div className={`rounded-xl border p-3 transition-colors ${isSynced ? 'border-success/30 bg-success/5' : 'border-char-3 bg-charcoal/40'}`}>
            <div className="flex items-center gap-3">
              {isSynced ? <CalendarCheck className="w-4 h-4 text-success flex-shrink-0" /> : <CalendarPlus className="w-4 h-4 text-muted flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${isSynced ? 'text-success' : 'text-muted'}`}>
                  {isSynced ? 'Sincronizado com Google Calendar' : 'Não está na agenda'}
                </p>
                <p className="text-[11px] text-muted/60 mt-0.5">
                  {isSynced ? 'Evento recorrente criado automaticamente' : 'Adicione para bloquear o horário na agenda'}
                </p>
              </div>
              {isSynced ? (
                <button onClick={handleRemoveFromCalendar} disabled={calState === 'syncing'}
                  className="flex items-center gap-1 text-[11px] text-danger/70 hover:text-danger border border-danger/20 hover:border-danger/40 px-2 py-1 rounded-lg transition-colors disabled:opacity-40 flex-shrink-0">
                  <CalendarX className="w-3 h-3" />
                  {calState === 'syncing' ? '...' : 'Remover'}
                </button>
              ) : (
                <button onClick={handleAddToCalendar} disabled={calState === 'syncing' || !form.days_of_week.length}
                  className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-colors disabled:opacity-40 flex-shrink-0 ${
                    calState === 'done' ? 'text-success border-success/30 bg-success/5' :
                    calState === 'error' ? 'text-danger border-danger/30' :
                    'text-gold border-gold/30 hover:bg-gold/5'
                  }`}>
                  <CalendarPlus className="w-3 h-3" />
                  {calState === 'syncing' ? 'Adicionando...' : calState === 'done' ? 'Adicionado!' : calState === 'error' ? 'Erro' : 'Adicionar'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-char-3">
          <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.days_of_week.length}
            className="flex-1 bg-gold text-charcoal text-sm font-semibold py-2.5 rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button onClick={onClose} className="px-4 text-sm text-muted hover:text-cream transition-colors">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de setup / templates ────────────────────────────────────────────────
function SetupModal({ existingTitles, onAdd, onClose }: {
  existingTitles: Set<string>
  onAdd: (templates: Template[]) => Promise<void>
  onClose: () => void
}) {
  const [activeCat, setActiveCat] = useState(CATEGORIES[0].id)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)

  const category = CATEGORIES.find(c => c.id === activeCat)!
  const available = category.templates.filter(t => !existingTitles.has(t.title.toLowerCase()))

  function toggle(title: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(title)) { next.delete(title) } else { next.add(title) }
      return next
    })
  }

  function selectAll() {
    const titles = available.map(t => t.title)
    const allSelected = titles.every(t => selected.has(t))
    setSelected(prev => {
      const next = new Set(prev)
      titles.forEach(t => allSelected ? next.delete(t) : next.add(t))
      return next
    })
  }

  async function handleAdd() {
    if (!selected.size) return
    setAdding(true)
    const toAdd = ALL_TEMPLATES.filter(t => selected.has(t.title) && !existingTitles.has(t.title.toLowerCase()))
    await onAdd(toAdd)
    setSelected(new Set())
    setAdding(false)
  }

  const catAvailableCount = available.length
  const catSelectedCount = available.filter(t => selected.has(t.title)).length
  const allCatSelected = catAvailableCount > 0 && catSelectedCount === catAvailableCount

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-char-2 border border-char-3 rounded-2xl w-full max-w-lg shadow-2xl fade-up flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-char-3 flex-shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-cream">Configurar rotinas</h3>
            <p className="text-xs text-muted mt-0.5">Selecione as rotinas que fazem sentido para você</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-cream transition-colors p-1"><X className="w-4 h-4" /></button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-2 border-b border-char-3/60 flex-shrink-0 overflow-x-auto">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            const catCount = cat.templates.filter(t => !existingTitles.has(t.title.toLowerCase()) && selected.has(t.title)).length
            return (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex-shrink-0 ${
                  activeCat === cat.id
                    ? 'bg-char-3 text-cream'
                    : 'text-muted hover:text-cream'
                }`}>
                <Icon className={`w-3.5 h-3.5 ${activeCat === cat.id ? cat.color : ''}`} />
                {cat.label}
                {catCount > 0 && (
                  <span className="bg-gold text-charcoal text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{catCount}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Template list */}
        <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
          {available.length === 0 ? (
            <div className="text-center py-8">
              <Check className="w-6 h-6 text-success mx-auto mb-2" />
              <p className="text-sm text-muted">Todos os templates desta categoria já foram adicionados.</p>
            </div>
          ) : (
            <>
              <button onClick={selectAll}
                className="w-full text-left px-3 py-2 text-xs text-muted hover:text-cream transition-colors flex items-center gap-2">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${allCatSelected ? 'bg-gold border-gold' : 'border-char-3'}`}>
                  {allCatSelected && <Check className="w-2.5 h-2.5 text-charcoal" />}
                </div>
                {allCatSelected ? 'Desmarcar todos' : 'Selecionar todos'}
              </button>

              {available.map(tpl => {
                const isSelected = selected.has(tpl.title)
                return (
                  <button key={tpl.title} onClick={() => toggle(tpl.title)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-all text-left ${
                      isSelected ? 'bg-gold/8 border-gold/30' : 'bg-charcoal border-char-3 hover:border-char-3/80'
                    }`}>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? 'bg-gold border-gold' : 'border-char-3'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-charcoal" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isSelected ? 'text-cream' : 'text-cream/80'}`}>{tpl.title}</p>
                      <p className="text-xs text-muted mt-0.5">{tpl.start_time} · {tpl.duration_minutes}min · {daysLabel(tpl.days_of_week)}</p>
                    </div>
                  </button>
                )
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-char-3 flex-shrink-0">
          <p className="text-xs text-muted">
            {selected.size > 0 ? `${selected.size} selecionada${selected.size > 1 ? 's' : ''}` : 'Nenhuma selecionada'}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm text-muted hover:text-cream transition-colors px-3 py-2">Cancelar</button>
            <button onClick={handleAdd} disabled={adding || !selected.size}
              className="flex items-center gap-2 bg-gold text-charcoal text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40">
              {adding ? 'Adicionando...' : `Adicionar${selected.size > 0 ? ` (${selected.size})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Timeline do dia ───────────────────────────────────────────────────────────
function DayTimeline({ routines, completedIds, onToggle, todayIdx }: {
  routines: Routine[]; completedIds: Set<string>; onToggle: (id: string) => void; todayIdx: number
}) {
  const today = routines
    .filter(r => r.active && r.days_of_week.includes(todayIdx))
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  if (today.length === 0) return null

  const allMins = today.flatMap(r => [toMin(r.start_time), toMin(r.start_time) + r.duration_minutes])
  const minStart = Math.max(0, Math.min(...allMins) - 15)
  const maxEnd = Math.min(24 * 60, Math.max(...allMins) + 15)
  const range = maxEnd - minStart
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
  const nowPct = Math.min(100, Math.max(0, ((nowMins - minStart) / range) * 100))
  const showNow = nowMins >= minStart && nowMins <= maxEnd
  const done = today.filter(r => r.id && completedIds.has(r.id)).length
  const pct = today.length > 0 ? Math.round((done / today.length) * 100) : 0

  return (
    <div className="bg-char-2 border border-char-3 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-char-3/60">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-gold" />
          <span className="text-sm font-semibold text-cream">Hoje — {DAYS[todayIdx]}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">{done}/{today.length}</span>
          <div className="w-16 h-1.5 bg-char-3 rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-2">
        <div className="relative h-8 bg-charcoal rounded-lg overflow-hidden">
          {today.map(r => {
            const left = ((toMin(r.start_time) - minStart) / range) * 100
            const width = Math.max((r.duration_minutes / range) * 100, 1.5)
            const isDone = r.id ? completedIds.has(r.id) : false
            return (
              <div key={r.id}
                className={`absolute top-1.5 bottom-1.5 rounded-md transition-all ${isDone ? 'bg-gold/30' : 'bg-gold/70'}`}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${r.title} ${r.start_time}`} />
            )
          })}
          {showNow && <div className="absolute top-0 bottom-0 w-0.5 bg-danger z-10" style={{ left: `${nowPct}%` }} />}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted/60">{String(Math.floor(minStart / 60)).padStart(2, '0')}:{String(minStart % 60).padStart(2, '0')}</span>
          <span className="text-[10px] text-muted/60">{String(Math.floor(maxEnd / 60)).padStart(2, '0')}:{String(maxEnd % 60).padStart(2, '0')}</span>
        </div>
      </div>

      <div className="px-2 pb-2 space-y-0.5">
        {today.map(r => {
          const isDone = r.id ? completedIds.has(r.id) : false
          const rStart = toMin(r.start_time)
          const isNow = nowMins >= rStart && nowMins <= rStart + r.duration_minutes
          return (
            <button key={r.id} onClick={() => r.id && onToggle(r.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${isNow && !isDone ? 'bg-gold/6' : 'hover:bg-charcoal/60'}`}>
              <div className={`w-[18px] h-[18px] rounded-md flex-shrink-0 border flex items-center justify-center transition-colors ${isDone ? 'bg-gold border-gold' : isNow ? 'border-gold/60' : 'border-char-3'}`}>
                {isDone && <Check className="w-2.5 h-2.5 text-charcoal" />}
              </div>
              <span className="text-xs text-muted tabular-nums w-10 flex-shrink-0">{r.start_time}</span>
              <span className={`text-sm flex-1 truncate ${isDone ? 'line-through text-muted' : isNow ? 'text-cream font-medium' : 'text-cream/90'}`}>{r.title}</span>
              {isNow && !isDone && <span className="text-[10px] text-gold bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded-full flex-shrink-0">agora</span>}
              <span className="text-[10px] text-muted/60 flex-shrink-0">{r.duration_minutes}min</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Card de rotina ────────────────────────────────────────────────────────────
function RoutineCard({ routine, onEdit, onDelete, onToggleActive }: {
  routine: Routine; onEdit: () => void; onDelete: () => void; onToggleActive: (active: boolean) => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)

  if (confirmDel) return (
    <div className="flex items-center gap-3 px-4 py-3 bg-charcoal border border-char-3 rounded-xl">
      <p className="text-xs text-danger flex-1">Excluir <strong>{routine.title}</strong>?</p>
      <button onClick={onDelete} className="text-xs text-danger border border-danger/30 bg-danger/10 px-2.5 py-1 rounded-lg hover:bg-danger/20 transition-colors">Excluir</button>
      <button onClick={() => setConfirmDel(false)} className="text-xs text-muted hover:text-cream transition-colors px-1">Cancelar</button>
    </div>
  )

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border rounded-xl transition-colors group ${routine.active ? 'bg-charcoal border-char-3 hover:border-char-3/80' : 'bg-charcoal/30 border-char-3/40'}`}>
      <button onClick={() => onToggleActive(!routine.active)}
        className={`w-[18px] h-[18px] rounded-md flex-shrink-0 border flex items-center justify-center transition-colors ${routine.active ? 'bg-gold border-gold' : 'border-char-3 hover:border-gold/40'}`}>
        {routine.active && <Check className="w-2.5 h-2.5 text-charcoal" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${routine.active ? 'text-cream' : 'text-muted line-through'}`}>{routine.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-muted">{routine.start_time} · {routine.duration_minutes}min · {daysLabel(routine.days_of_week)}</p>
          {routine.gcal_event_id
            ? <span title="Sincronizado com Google Calendar"><CalendarCheck className="w-3 h-3 text-success/70 flex-shrink-0" /></span>
            : <span title="Não está na agenda"><CalendarPlus className="w-3 h-3 text-muted/30 flex-shrink-0" /></span>
          }
        </div>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={onEdit} className="p-1.5 text-muted hover:text-gold rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={() => setConfirmDel(true)} className="p-1.5 text-muted hover:text-danger rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  )
}

// ── Seção recolhível ──────────────────────────────────────────────────────────
function Section({ icon: Icon, label, count, children, defaultOpen = true }: {
  icon: React.ElementType; label: string; count: number; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-char-2 border border-char-3 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-char-3/30 transition-colors">
        <Icon className="w-3.5 h-3.5 text-muted" />
        <span className="text-xs font-semibold text-cream flex-1 text-left">{label}</span>
        <span className="text-xs text-muted bg-char-3 px-1.5 py-0.5 rounded-full">{count}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-3 pb-3 space-y-1.5 border-t border-char-3/60 pt-3">{children}</div>}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onSetup, onNew }: { onSetup: () => void; onNew: () => void }) {
  return (
    <div className="bg-char-2 border border-char-3 rounded-2xl p-8 text-center space-y-6">
      <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto">
        <Sparkles className="w-6 h-6 text-gold" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-cream mb-1">Nenhuma rotina ainda</h2>
        <p className="text-sm text-muted leading-relaxed max-w-xs mx-auto">
          Rotinas bem definidas são a base de uma agenda produtiva. Comece pelos templates ou crie as suas.
        </p>
      </div>

      {/* Categorias preview */}
      <div className="grid grid-cols-2 gap-2 text-left max-w-sm mx-auto">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          return (
            <button key={cat.id} onClick={onSetup}
              className="flex items-center gap-2.5 bg-charcoal border border-char-3 hover:border-gold/30 rounded-xl px-3 py-2.5 transition-colors group">
              <Icon className={`w-4 h-4 ${cat.color} flex-shrink-0`} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-cream">{cat.label}</p>
                <p className="text-[11px] text-muted">{cat.templates.length} rotinas</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex gap-2 justify-center">
        <button onClick={onSetup}
          className="flex items-center gap-2 bg-gold text-charcoal text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gold-light transition-colors">
          <Zap className="w-4 h-4" />
          Configurar com templates
        </button>
        <button onClick={onNew}
          className="flex items-center gap-2 border border-char-3 text-muted text-sm px-4 py-2.5 rounded-xl hover:text-cream hover:border-char-3/80 transition-colors">
          <Plus className="w-4 h-4" />
          Criar manualmente
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function RotinasPage() {
  const supabase = createBrowserClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set())

  const [modal, setModal] = useState<'none' | 'new' | 'setup'>('none')
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null)

  const todayISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const todayIdx = new Date().getDay()

  const load = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return
    setUserId(u.id)
    const [routinesRes, completionsRes] = await Promise.all([
      supabase.from('routines').select('*').eq('user_id', u.id).order('start_time'),
      supabase.from('routine_completions').select('routine_id').eq('user_id', u.id).eq('completed_date', todayISO),
    ])
    setRoutines(routinesRes.data ?? [])
    setCompletedToday(new Set((completionsRes.data ?? []).map((c: { routine_id: string }) => c.routine_id)))
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  async function createCalEvent(r: Routine, id: string) {
    if (!r.days_of_week.length) return null
    const occ = nextOccurrence(r.days_of_week, r.start_time, r.duration_minutes)
    if (!occ) return null
    try {
      const byDay = r.days_of_week.map(d => RRULE_DAYS[d]).join(',')
      const res = await fetch('/api/calendar/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: r.title, start_datetime: occ.start, end_datetime: occ.end, recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${byDay}`] }),
      })
      const json = await res.json()
      if (json.id) { await supabase.from('routines').update({ gcal_event_id: json.id }).eq('id', id); return json.id }
    } catch { /* ignorar */ }
    return null
  }

  async function addRoutine(form: Routine) {
    if (!userId) return
    const { data } = await supabase.from('routines').insert({ ...form, user_id: userId }).select().single()
    if (data) {
      const gcalId = await createCalEvent(form, data.id)
      setRoutines(r => [...r, { ...data, gcal_event_id: gcalId }].sort((a, b) => a.start_time.localeCompare(b.start_time)))
    }
    setModal('none')
  }

  async function addTemplates(templates: Template[]) {
    if (!userId || !templates.length) return
    const inserted: Routine[] = []
    for (const tpl of templates) {
      const form: Routine = { ...tpl, active: true }
      const { data } = await supabase.from('routines').insert({ ...form, user_id: userId }).select().single()
      if (data) {
        const gcalId = await createCalEvent(form, data.id)
        inserted.push({ ...data, gcal_event_id: gcalId })
      }
    }
    setRoutines(r => [...r, ...inserted].sort((a, b) => a.start_time.localeCompare(b.start_time)))
    setModal('none')
  }

  async function saveEdit(updated: Routine) {
    if (!editingRoutine?.id) return
    const { data } = await supabase.from('routines').update({
      title: updated.title, start_time: updated.start_time,
      duration_minutes: updated.duration_minutes, days_of_week: updated.days_of_week,
      gcal_event_id: updated.gcal_event_id ?? editingRoutine.gcal_event_id,
    }).eq('id', editingRoutine.id).select().single()

    const eventId = updated.gcal_event_id ?? editingRoutine.gcal_event_id
    if (eventId) {
      const occ = nextOccurrence(updated.days_of_week, updated.start_time, updated.duration_minutes)
      if (occ) {
        const byDay = updated.days_of_week.map(d => RRULE_DAYS[d]).join(',')
        fetch('/api/calendar/update', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, title: updated.title, start_datetime: occ.start, end_datetime: occ.end, recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${byDay}`] }),
        }).catch(() => {})
      }
    }

    if (data) setRoutines(r => r.map(x => x.id === editingRoutine.id ? data : x).sort((a, b) => a.start_time.localeCompare(b.start_time)))
    setEditingRoutine(null)
  }

  async function addToCalendar(form: Routine): Promise<string | null> {
    if (!form.id || !form.days_of_week.length) return null
    const id = await createCalEvent(form, form.id)
    if (id) setRoutines(r => r.map(x => x.id === form.id ? { ...x, gcal_event_id: id } : x))
    return id
  }

  async function removeFromCalendar(eventId: string, routineId?: string): Promise<void> {
    await fetch('/api/calendar/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId }),
    }).catch(() => {})
    if (routineId) {
      await supabase.from('routines').update({ gcal_event_id: null }).eq('id', routineId)
      setRoutines(r => r.map(x => x.id === routineId ? { ...x, gcal_event_id: null } : x))
    }
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from('routines').update({ active }).eq('id', id)
    setRoutines(r => r.map(x => x.id === id ? { ...x, active } : x))
  }

  async function deleteRoutine(id: string) {
    const r = routines.find(x => x.id === id)
    await supabase.from('routines').delete().eq('id', id)
    if (r?.gcal_event_id) fetch('/api/calendar/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: r.gcal_event_id }) }).catch(() => {})
    setRoutines(r => r.filter(x => x.id !== id))
  }

  async function toggleCompletion(routineId: string) {
    if (!userId) return
    const done = completedToday.has(routineId)
    if (done) {
      await supabase.from('routine_completions').delete().eq('routine_id', routineId).eq('user_id', userId).eq('completed_date', todayISO)
      setCompletedToday(prev => { const s = new Set(prev); s.delete(routineId); return s })
    } else {
      await supabase.from('routine_completions').insert({ routine_id: routineId, user_id: userId, completed_date: todayISO })
      setCompletedToday(prev => { const s = new Set(prev); s.add(routineId); return s })
    }
  }

  const active = routines.filter(r => r.active)
  const inactive = routines.filter(r => !r.active)
  const daily = active.filter(r => r.days_of_week.length === 7)
  const specific = active.filter(r => r.days_of_week.length < 7)
  const existingTitles = new Set(routines.map(r => r.title.toLowerCase()))
  const totalMinsToday = active.filter(r => r.days_of_week.includes(todayIdx)).reduce((a, r) => a + r.duration_minutes, 0)

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Modais */}
      {modal === 'new' && (
        <RoutineModal routine={EMPTY_ROUTINE} title="Nova rotina" onSave={addRoutine} onClose={() => setModal('none')} />
      )}
      {modal === 'setup' && (
        <SetupModal existingTitles={existingTitles} onAdd={addTemplates} onClose={() => setModal('none')} />
      )}
      {editingRoutine && (
        <RoutineModal
          routine={editingRoutine}
          title="Editar rotina"
          onSave={saveEdit}
          onClose={() => setEditingRoutine(null)}
          onAddToCalendar={(r) => addToCalendar(r)}
          onRemoveFromCalendar={(eventId) => removeFromCalendar(eventId, editingRoutine.id)}
        />
      )}

      {/* Header */}
      {routines.length > 0 && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-cream">Rotinas</h1>
            <p className="text-xs text-muted mt-0.5">
              {active.length} ativas{totalMinsToday > 0 ? ` · ${Math.round(totalMinsToday / 60 * 10) / 10}h hoje` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setModal('setup')}
              className="flex items-center gap-1.5 border border-char-3 text-muted text-xs font-medium px-3 py-2 rounded-lg hover:text-gold hover:border-gold/40 transition-colors">
              <Zap className="w-3.5 h-3.5" />
              Templates
            </button>
            <button onClick={() => setModal('new')}
              className="flex items-center gap-1.5 bg-gold text-charcoal text-xs font-semibold px-3 py-2 rounded-lg hover:bg-gold-light transition-colors">
              <Plus className="w-3.5 h-3.5" />
              Nova
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {routines.length === 0 && (
        <EmptyState onSetup={() => setModal('setup')} onNew={() => setModal('new')} />
      )}

      {/* Timeline do dia */}
      {routines.length > 0 && (
        <DayTimeline routines={routines} completedIds={completedToday} onToggle={toggleCompletion} todayIdx={todayIdx} />
      )}

      {/* Listas */}
      {daily.length > 0 && (
        <Section icon={RefreshCw} label="Todo dia" count={daily.length}>
          {daily.map(r => (
            <RoutineCard key={r.id} routine={r}
              onEdit={() => setEditingRoutine(r)}
              onDelete={() => deleteRoutine(r.id!)}
              onToggleActive={(a) => toggleActive(r.id!, a)} />
          ))}
        </Section>
      )}

      {specific.length > 0 && (
        <Section icon={Clock} label="Dias específicos" count={specific.length}>
          {specific.map(r => (
            <RoutineCard key={r.id} routine={r}
              onEdit={() => setEditingRoutine(r)}
              onDelete={() => deleteRoutine(r.id!)}
              onToggleActive={(a) => toggleActive(r.id!, a)} />
          ))}
        </Section>
      )}

      {inactive.length > 0 && (
        <Section icon={X} label="Pausadas" count={inactive.length} defaultOpen={false}>
          {inactive.map(r => (
            <RoutineCard key={r.id} routine={r}
              onEdit={() => setEditingRoutine(r)}
              onDelete={() => deleteRoutine(r.id!)}
              onToggleActive={(a) => toggleActive(r.id!, a)} />
          ))}
        </Section>
      )}
    </div>
  )
}
