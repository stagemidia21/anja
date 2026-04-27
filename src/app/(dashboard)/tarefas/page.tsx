'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { Plus, ArrowRight, Trash2, Clock, Calendar, AlertCircle, Tag, Filter, BarChart2, Pencil, X, CalendarPlus, Check } from 'lucide-react'

type Priority = 'alta' | 'media' | 'baixa'
type Status = 'fazer' | 'fazendo' | 'feito'

interface Task {
  id: string
  title: string
  note?: string
  priority: Priority
  status: Status
  category?: string
  due_date?: string
  scheduled_at?: string
  duration_minutes?: number
  tags?: string[]
  created_at: string
}

type TaskForm = {
  title: string
  note: string
  priority: Priority
  category: string
  due_date: string
  scheduled_at: string
  duration_minutes: number | ''
  tags: string
}

const priorityDot: Record<Priority, string> = { alta: 'bg-danger', media: 'bg-gold', baixa: 'bg-muted' }
const priorityLabel: Record<Priority, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }
const priorityColor: Record<Priority, string> = { alta: 'text-danger', media: 'text-gold', baixa: 'text-muted' }

const DURATIONS = [
  { value: 15, label: '15 min' }, { value: 30, label: '30 min' },
  { value: 45, label: '45 min' }, { value: 60, label: '1h' },
  { value: 90, label: '1h30' },  { value: 120, label: '2h' },
  { value: 180, label: '3h' },   { value: 240, label: '4h' },
]
const CATEGORIES = ['Tráfego', 'Clientes', 'Financeiro', 'Admin', 'Conteúdo', 'Reunião', 'Pessoal']
const columns: { key: Status; label: string }[] = [
  { key: 'fazer', label: 'A fazer' },
  { key: 'fazendo', label: 'Em andamento' },
  { key: 'feito', label: 'Concluído' },
]

function formatDuration(min: number) {
  return min >= 60 ? `${min / 60 % 1 === 0 ? min / 60 : (min / 60).toFixed(1)}h` : `${min}min`
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}
function formatDue(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return { label: 'Atrasada', class: 'text-danger' }
  if (diff === 0) return { label: 'Hoje', class: 'text-gold' }
  if (diff === 1) return { label: 'Amanhã', class: 'text-gold/80' }
  return { label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), class: 'text-muted' }
}
function taskToForm(t: Task): TaskForm {
  return {
    title: t.title,
    note: t.note ?? '',
    priority: t.priority,
    category: t.category ?? '',
    due_date: t.due_date ?? '',
    scheduled_at: t.scheduled_at ? t.scheduled_at.slice(0, 16) : '',
    duration_minutes: t.duration_minutes ?? '',
    tags: t.tags?.join(', ') ?? '',
  }
}

const EMPTY_FORM: TaskForm = {
  title: '', note: '', priority: 'media', category: '',
  due_date: '', scheduled_at: '', duration_minutes: '', tags: '',
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[0, 1, 2].map((col) => (
        <div key={col} className="space-y-2">
          <div className="h-4 w-20 skeleton rounded" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-char-2 border border-char-3 rounded-xl p-3 space-y-2">
              <div className="h-4 skeleton rounded w-3/4" />
              <div className="h-3 skeleton rounded w-1/3" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Modal de edição ────────────────────────────────────────────────────
function TaskModal({ task, onSave, onClose, onSendToCalendar }: {
  task: Task
  onSave: (id: string, form: TaskForm) => Promise<void>
  onClose: () => void
  onSendToCalendar: (task: Task) => Promise<void>
}) {
  const [form, setForm] = useState<TaskForm>(taskToForm(task))
  const [saving, setSaving] = useState(false)
  const [sendingCal, setSendingCal] = useState(false)
  const [calDone, setCalDone] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(task.id, form)
    setSaving(false)
    onClose()
  }

  async function handleSendToCalendar() {
    setSendingCal(true)
    const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : task.tags
    const updated: Task = { ...task, ...form, tags, duration_minutes: form.duration_minutes || undefined }
    await onSendToCalendar(updated)
    setSendingCal(false)
    setCalDone(true)
    setTimeout(() => setCalDone(false), 3000)
  }

  const inputCls = "w-full bg-charcoal border border-char-3 text-cream text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-gold/50 placeholder:text-muted"

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-char-2 border border-char-3 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl fade-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-char-3 sticky top-0 bg-char-2 z-10">
          <h3 className="text-sm font-semibold text-cream">Editar tarefa</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendToCalendar}
              disabled={sendingCal || !form.scheduled_at}
              title={!form.scheduled_at ? 'Defina um horário para agendar' : 'Adicionar ao Google Calendar'}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${
                calDone
                  ? 'bg-success/10 text-success border-success/30'
                  : 'bg-char-3 text-muted border-char-3 hover:text-gold hover:border-gold/30'
              }`}>
              {calDone ? <><Check className="w-3.5 h-3.5" />Agendado</> : sendingCal ? '...' : <><CalendarPlus className="w-3.5 h-3.5" />Agenda</>}
            </button>
            <button onClick={onClose} className="text-muted hover:text-cream transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted mb-1 block">Título</label>
            <input autoFocus type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className={inputCls} placeholder="Título da tarefa..." />
          </div>

          <div>
            <label className="text-xs text-muted mb-1 block">Nota</label>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              rows={3} placeholder="Descrição, contexto, links..." className={`${inputCls} resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block">Prioridade</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                className={inputCls}>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Categoria</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className={inputCls}>
                <option value="">Sem categoria</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Duração</label>
              <select value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value ? Number(e.target.value) : '' }))}
                className={inputCls}>
                <option value="">—</option>
                {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Prazo</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className={inputCls} />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted mb-1 block">
              Agendar em
              {!form.scheduled_at && <span className="text-muted/60 ml-1">(necessário para adicionar à agenda)</span>}
            </label>
            <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
              className={inputCls} />
          </div>

          <div>
            <label className="text-xs text-muted mb-1 block">Tags (separadas por vírgula)</label>
            <input type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="ex: urgente, cliente, fup" className={inputCls} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-char-3 sticky bottom-0 bg-char-2">
          <button onClick={handleSave} disabled={saving || !form.title.trim()}
            className="bg-gold text-charcoal text-sm font-semibold px-5 py-2 rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40 flex-1">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button onClick={onClose} className="text-muted text-sm hover:text-cream transition-colors px-4">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, col, onMove, onDelete, onEdit }: {
  task: Task
  col: Status
  onMove: (id: string, status: Status) => void
  onDelete: (id: string) => void
  onEdit: (task: Task) => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  const [dragging, setDragging] = useState(false)
  const due = task.due_date ? formatDue(task.due_date) : null

  return (
    <div
      draggable={!confirmDel}
      onDragStart={e => {
        e.dataTransfer.setData('taskId', task.id)
        e.dataTransfer.setData('fromCol', col)
        e.dataTransfer.effectAllowed = 'move'
        setDragging(true)
      }}
      onDragEnd={() => setDragging(false)}
      className={`bg-char-2 border rounded-xl p-3 group transition-all cursor-grab active:cursor-grabbing select-none ${
        dragging ? 'opacity-40 scale-[0.97]' :
        task.status === 'feito' ? 'border-char-3/40 opacity-60' : 'border-char-3 hover:border-char-3/80'
      }`}>
      {confirmDel ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-danger" />
            <span className="text-xs font-medium text-danger">Excluir tarefa?</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onDelete(task.id)}
              className="flex-1 text-xs bg-danger/10 text-danger border border-danger/30 rounded-lg py-1.5 hover:bg-danger/20 transition-colors">
              Excluir
            </button>
            <button onClick={() => setConfirmDel(false)}
              className="flex-1 text-xs text-muted border border-char-3 rounded-lg py-1.5 hover:text-cream transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2">
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${priorityDot[task.priority]}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm leading-snug ${task.status === 'feito' ? 'line-through text-muted' : 'text-cream'}`}>
                {task.title}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`text-xs ${priorityColor[task.priority]}`}>{priorityLabel[task.priority]}</span>
                {task.category && (
                  <span className="text-xs text-muted bg-char-3 px-1.5 py-0.5 rounded-md">{task.category}</span>
                )}
                {due && (
                  <span className={`text-xs ${due.class} flex items-center gap-0.5`}>
                    <Calendar className="w-3 h-3" />{due.label}
                  </span>
                )}
              </div>
              {task.scheduled_at && (
                <div className="flex items-center gap-1 mt-1.5">
                  <Clock className="w-3 h-3 text-gold flex-shrink-0" />
                  <span className="text-xs text-gold">{formatDate(task.scheduled_at)}</span>
                  {task.duration_minutes && (
                    <span className="text-xs text-muted">· {formatDuration(task.duration_minutes)}</span>
                  )}
                </div>
              )}
              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {task.tags.map(tag => (
                    <span key={tag} className="text-[10px] text-muted/80 bg-char-3/50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Tag className="w-2.5 h-2.5" />{tag}
                    </span>
                  ))}
                </div>
              )}
              {task.note && (
                <p className="text-xs text-muted/70 mt-1.5 leading-relaxed line-clamp-2">{task.note}</p>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(task)} className="p-1 text-muted hover:text-gold transition-colors" aria-label="Editar">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setConfirmDel(true)} className="p-1 text-muted hover:text-danger transition-colors" aria-label="Excluir">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-2 pt-2 border-t border-char-3/40">
            {columns.filter(c => c.key !== col).map(c => (
              <button key={c.key} onClick={() => onMove(task.id, c.key)}
                className="text-xs text-muted hover:text-gold transition-colors flex items-center gap-1">
                <ArrowRight className="w-3 h-3" />{c.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Kanban Column (drop zone) ────────────────────────────────────────────
function KanbanColumn({ col, tasks, onMove, onDelete, onEdit }: {
  col: { key: Status; label: string }
  tasks: Task[]
  onMove: (id: string, status: Status) => void
  onDelete: (id: string) => void
  onEdit: (task: Task) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  let dragCounter = 0

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    dragCounter++
    setDragOver(true)
  }
  function handleDragLeave() {
    dragCounter--
    if (dragCounter <= 0) { dragCounter = 0; setDragOver(false) }
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    dragCounter = 0
    setDragOver(false)
    const taskId = e.dataTransfer.getData('taskId')
    const fromCol = e.dataTransfer.getData('fromCol') as Status
    if (taskId && fromCol !== col.key) onMove(taskId, col.key)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-xs text-muted uppercase tracking-wide font-medium">{col.label}</span>
        <span className="text-xs text-muted tabular-nums bg-char-3 px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`space-y-2 min-h-[100px] rounded-xl transition-all duration-150 p-1 -m-1 ${
          dragOver ? 'bg-gold/5 ring-1 ring-gold/25' : ''
        }`}
      >
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} col={col.key}
            onMove={onMove} onDelete={onDelete} onEdit={onEdit} />
        ))}
        {tasks.length === 0 && (
          <div className={`border border-dashed rounded-xl p-5 text-center transition-colors ${
            dragOver ? 'border-gold/40 bg-gold/5' : 'border-char-3/50'
          }`}>
            <p className="text-xs text-muted">{dragOver ? 'Soltar aqui' : 'Nenhuma tarefa'}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────
export default function TarefasPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [filterPriority, setFilterPriority] = useState<Priority | 'todas'>('todas')
  const [filterStatus, setFilterStatus] = useState<Status | 'todas'>('todas')
  const [filterCategory, setFilterCategory] = useState<string>('todas')
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM)
  const [titleTouched, setTitleTouched] = useState(false)

  const toast = useToast()
  const supabase = createBrowserClient()
  const [userId, setUserId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)
    const { data } = await supabase.from('tasks').select('*')
      .eq('user_id', user.id)
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    setTasks(data ?? [])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setAdding(true)
    const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    const { data, error } = await supabase.from('tasks').insert({
      user_id: userId,
      title: form.title.trim(),
      note: form.note.trim() || null,
      priority: form.priority,
      status: 'fazer',
      category: form.category || null,
      due_date: form.due_date || null,
      scheduled_at: form.scheduled_at || null,
      duration_minutes: form.duration_minutes || null,
      tags: tags.length ? tags : null,
    }).select().single()
    if (error) {
      console.error('[tarefas] Erro ao criar tarefa:', error)
      toast.error('Erro ao criar tarefa: ' + error.message)
    }
    if (data) {
      setTasks(prev => [data, ...prev])
      toast.success('Tarefa criada')
      if (data.scheduled_at) {
        sendToCalendarSilent(data).catch(() => {})
      }
    }
    setForm(EMPTY_FORM)
    setTitleTouched(false)
    setShowForm(false)
    setAdding(false)
  }

  async function saveTask(id: string, f: TaskForm) {
    const tags = f.tags ? f.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    const { data, error } = await supabase.from('tasks').update({
      title: f.title.trim(),
      note: f.note.trim() || null,
      priority: f.priority,
      category: f.category || null,
      due_date: f.due_date || null,
      scheduled_at: f.scheduled_at || null,
      duration_minutes: f.duration_minutes || null,
      tags: tags.length ? tags : null,
    }).eq('id', id).select().single()
    if (error) { toast.error('Erro ao salvar: ' + error.message); return }
    if (data) {
      setTasks(prev => prev.map(t => t.id === id ? data : t))
      toast.success('Tarefa salva')
    }
  }

  async function moveTask(id: string, status: Status) {
    const prev = tasks.find(t => t.id === id)
    setTasks(ts => ts.map(t => t.id === id ? { ...t, status } : t))
    const { error } = await supabase.from('tasks').update({ status }).eq('id', id)
    if (error) {
      if (prev) setTasks(ts => ts.map(t => t.id === id ? prev : t))
      toast.error('Erro ao mover tarefa')
    } else {
      const label = status === 'fazendo' ? 'Em andamento' : status === 'feito' ? 'Concluído' : 'A fazer'
      toast.info(`Movida para ${label}`)
    }
  }

  async function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
    toast.info('Tarefa excluída')
  }

  async function sendToCalendarSilent(task: Task) {
    if (!task.scheduled_at) return
    const start = new Date(task.scheduled_at)
    const end = new Date(start.getTime() + (task.duration_minutes ?? 30) * 60000)
    const res = await fetch('/api/calendar/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: task.title,
        description: task.note ?? '',
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
      }),
    })
    if (res.ok) {
      toast.success('Adicionado à agenda')
    } else {
      const err = await res.json()
      toast.error('Erro ao agendar: ' + (err.error ?? res.statusText))
    }
  }

  async function sendToCalendar(task: Task) {
    if (!task.scheduled_at) return
    await sendToCalendarSilent(task)
  }

  const filtered = tasks.filter(t => {
    if (filterPriority !== 'todas' && t.priority !== filterPriority) return false
    if (filterStatus !== 'todas' && t.status !== filterStatus) return false
    if (filterCategory !== 'todas' && (t.category ?? '') !== filterCategory) return false
    return true
  })

  const byStatus = (s: Status) => filtered.filter(t => t.status === s)
  const pending = tasks.filter(t => t.status !== 'feito').length
  const alta = tasks.filter(t => t.priority === 'alta' && t.status !== 'feito').length

  const usedCategories = useMemo(() => {
    const cats = new Set(tasks.map(t => t.category ?? '').filter(Boolean))
    return Array.from(cats).sort()
  }, [tasks])

  const analytics = useMemo(() => {
    const map: Record<string, { total: number; done: number; count: number; countDone: number }> = {}
    tasks.forEach(t => {
      const cat = t.category || 'Sem categoria'
      if (!map[cat]) map[cat] = { total: 0, done: 0, count: 0, countDone: 0 }
      map[cat].count++
      map[cat].total += t.duration_minutes ?? 0
      if (t.status === 'feito') { map[cat].countDone++; map[cat].done += t.duration_minutes ?? 0 }
    })
    return Object.entries(map).map(([cat, v]) => ({ cat, ...v })).sort((a, b) => b.total - a.total)
  }, [tasks])

  const maxTotal = Math.max(...analytics.map(a => a.total), 1)
  const inputCls = "w-full bg-charcoal border border-char-3 text-cream text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-gold/50 placeholder:text-muted"

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Modal de edição */}
      {editingTask && (
        <TaskModal
          task={editingTask}
          onSave={saveTask}
          onClose={() => setEditingTask(null)}
          onSendToCalendar={sendToCalendar}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-base font-semibold text-cream">Tarefas</h1>
          <p className="text-xs text-muted mt-0.5">
            {pending} pendentes{alta > 0 ? ` · ${alta} alta prioridade` : ''}
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-gold text-charcoal text-sm font-semibold px-3 py-2 rounded-lg hover:bg-gold-light transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Nova tarefa
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-start gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted flex-shrink-0 mt-1.5" />
        <div className="flex gap-1.5 flex-wrap flex-1">
          {(['todas', 'fazer', 'fazendo', 'feito'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                filterStatus === s ? 'bg-gold/20 text-gold border border-gold/30' : 'text-muted bg-char-2 border border-char-3 hover:border-char-3/60'
              }`}>
              {s === 'todas' ? 'Todos' : s === 'fazer' ? 'A fazer' : s === 'fazendo' ? 'Em andamento' : 'Concluído'}
            </button>
          ))}
          <span className="text-char-3 self-center">|</span>
          {(['todas', 'alta', 'media', 'baixa'] as const).map(p => (
            <button key={p} onClick={() => setFilterPriority(p)}
              className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                filterPriority === p ? 'bg-gold/20 text-gold border border-gold/30' : 'text-muted bg-char-2 border border-char-3 hover:border-char-3/60'
              }`}>
              {p === 'todas' ? 'Todas' : p === 'alta' ? 'Alta' : p === 'media' ? 'Média' : 'Baixa'}
            </button>
          ))}
          {usedCategories.length > 0 && (
            <>
              <span className="text-char-3 self-center">|</span>
              <button onClick={() => setFilterCategory('todas')}
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                  filterCategory === 'todas' ? 'bg-gold/20 text-gold border border-gold/30' : 'text-muted bg-char-2 border border-char-3 hover:border-char-3/60'
                }`}>
                Todas categorias
              </button>
              {usedCategories.map(cat => (
                <button key={cat} onClick={() => setFilterCategory(cat)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                    filterCategory === cat ? 'bg-gold/20 text-gold border border-gold/30' : 'text-muted bg-char-2 border border-char-3 hover:border-char-3/60'
                  }`}>
                  {cat}
                </button>
              ))}
            </>
          )}
        </div>
        <button onClick={() => setShowAnalytics(v => !v)}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors ${
            showAnalytics ? 'bg-gold/20 text-gold border-gold/30' : 'text-muted bg-char-2 border-char-3 hover:border-char-3/60'
          }`}>
          <BarChart2 className="w-3.5 h-3.5" />
          Tempo
        </button>
      </div>

      {/* Analytics */}
      {showAnalytics && analytics.length > 0 && (
        <div className="bg-char-2 border border-char-3 rounded-xl p-4 space-y-3 fade-up">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-3.5 h-3.5 text-gold" />
            <span className="text-xs font-semibold text-cream">Tempo por categoria</span>
            <span className="text-xs text-muted ml-auto">planejado · concluído</span>
          </div>
          <div className="space-y-2.5">
            {analytics.map(({ cat, total, done, count, countDone }) => {
              const pct = total > 0 ? Math.round(done / total * 100) : 0
              const barW = Math.round(total / maxTotal * 100)
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-cream">{cat}</span>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>{countDone}/{count} tarefas</span>
                      <span className="tabular-nums">
                        {total > 0 ? <>{formatDuration(done)} <span className="text-muted/50">/ {formatDuration(total)}</span></> : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-char-3 rounded-full overflow-hidden" style={{ width: `${barW}%`, minWidth: '40px' }}>
                    <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="pt-1 border-t border-char-3 flex items-center justify-between text-xs text-muted">
            <span>Total planejado: {formatDuration(analytics.reduce((a, x) => a + x.total, 0))}</span>
            <span>Concluído: {formatDuration(analytics.reduce((a, x) => a + x.done, 0))}</span>
          </div>
        </div>
      )}

      {/* Form nova tarefa */}
      {showForm && (
        <form onSubmit={addTask} className="bg-char-2 border border-gold/20 rounded-xl p-5 space-y-4 fade-up">
          <h3 className="text-sm font-semibold text-cream">Nova tarefa</h3>
          <div>
            <input autoFocus type="text" placeholder="Título da tarefa..."
              value={form.title}
              onChange={e => { setTitleTouched(true); setForm(f => ({ ...f, title: e.target.value })) }}
              onBlur={() => setTitleTouched(true)}
              className={`${inputCls} ${titleTouched && !form.title.trim() ? 'border-danger/60' : ''}`} />
            {titleTouched && !form.title.trim() && (
              <p className="text-xs text-danger mt-1">Título obrigatório</p>
            )}
          </div>
          <textarea placeholder="Nota (opcional)" value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            rows={2} className={`${inputCls} resize-none`} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block">Prioridade</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))} className={inputCls}>
                <option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Categoria</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                <option value="">Sem categoria</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Duração</label>
              <select value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value ? Number(e.target.value) : '' }))} className={inputCls}>
                <option value="">—</option>
                {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Prazo</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Agendar em</label>
              <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Tags (vírgula)</label>
              <input type="text" placeholder="urgente, cliente" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={adding || !form.title.trim()}
              className="bg-gold text-charcoal text-sm font-semibold px-5 py-2 rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40">
              {adding ? 'Salvando...' : 'Adicionar'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setTitleTouched(false); setForm(EMPTY_FORM) }} className="text-muted text-sm hover:text-cream transition-colors px-2">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Kanban */}
      {loading ? <Skeleton /> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map(col => (
            <KanbanColumn key={col.key} col={col} tasks={byStatus(col.key)}
              onMove={moveTask} onDelete={deleteTask} onEdit={setEditingTask} />
          ))}
        </div>
      )}
    </div>
  )
}
