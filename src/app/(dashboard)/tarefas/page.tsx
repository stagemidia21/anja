'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Plus, CheckCircle2, Circle, ArrowRight, Trash2 } from 'lucide-react'

type Priority = 'alta' | 'media' | 'baixa'
type Status = 'fazer' | 'fazendo' | 'feito'

interface Task {
  id: string
  title: string
  priority: Priority
  status: Status
  note?: string
  due_date?: string
}

const priorityColors: Record<Priority, string> = {
  alta: 'text-danger',
  media: 'text-gold',
  baixa: 'text-muted',
}

const priorityLabels: Record<Priority, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
}

const columns: { key: Status; label: string }[] = [
  { key: 'fazer', label: 'A fazer' },
  { key: 'fazendo', label: 'Em andamento' },
  { key: 'feito', label: 'Concluído' },
]

export default function TarefasPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<Priority>('media')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const supabase = createBrowserClient()

  async function load() {
    if (loaded) return
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('position', { ascending: true })
    setTasks(data ?? [])
    setLoaded(true)
    setLoading(false)
  }

  // Load on mount
  if (!loaded && !loading) {
    load()
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setAdding(true)
    const { data } = await supabase
      .from('tasks')
      .insert({ title: newTitle.trim(), priority: newPriority, status: 'fazer' })
      .select()
      .single()
    if (data) setTasks((prev) => [...prev, data])
    setNewTitle('')
    setShowForm(false)
    setAdding(false)
  }

  async function moveTask(id: string, status: Status) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
    await supabase.from('tasks').update({ status }).eq('id', id)
  }

  async function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
  }

  const byStatus = (s: Status) => tasks.filter((t) => t.status === s)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-cream">Tarefas</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-gold text-charcoal text-sm font-semibold px-3 py-2 rounded-lg hover:bg-gold-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova tarefa
        </button>
      </div>

      {/* Form nova tarefa */}
      {showForm && (
        <form onSubmit={addTask} className="bg-char-2 border border-char-3 rounded-xl p-4 space-y-3">
          <input
            autoFocus
            type="text"
            placeholder="Título da tarefa..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full bg-charcoal border border-char-3 text-cream rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/40 placeholder:text-muted"
          />
          <div className="flex items-center gap-3">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Priority)}
              className="bg-charcoal border border-char-3 text-cream text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-gold/40"
            >
              <option value="alta">Prioridade alta</option>
              <option value="media">Prioridade média</option>
              <option value="baixa">Prioridade baixa</option>
            </select>
            <button
              type="submit"
              disabled={adding || !newTitle.trim()}
              className="bg-gold text-charcoal text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40"
            >
              {adding ? 'Salvando...' : 'Adicionar'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-muted text-sm hover:text-cream transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Kanban */}
      {loading ? (
        <div className="text-muted text-sm text-center py-12">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((col) => (
            <div key={col.key} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-muted uppercase tracking-wide">{col.label}</span>
                <span className="text-xs text-muted">{byStatus(col.key).length}</span>
              </div>
              <div className="space-y-2 min-h-[120px]">
                {byStatus(col.key).map((task) => (
                  <div
                    key={task.id}
                    className="bg-char-2 border border-char-3 rounded-xl p-3 group"
                  >
                    <div className="flex items-start gap-2">
                      {task.status === 'feito' ? (
                        <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm text-cream ${task.status === 'feito' ? 'line-through text-muted' : ''}`}>
                          {task.title}
                        </p>
                        <span className={`text-xs ${priorityColors[task.priority]}`}>
                          {priorityLabels[task.priority]}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Excluir tarefa"
                      >
                        <Trash2 className="w-3 h-3 text-muted hover:text-danger transition-colors" />
                      </button>
                    </div>

                    {/* Mover para coluna */}
                    <div className="flex gap-1 mt-2 pt-2 border-t border-char-3">
                      {columns
                        .filter((c) => c.key !== col.key)
                        .map((c) => (
                          <button
                            key={c.key}
                            onClick={() => moveTask(task.id, c.key)}
                            className="text-xs text-muted hover:text-gold transition-colors flex items-center gap-1"
                          >
                            <ArrowRight className="w-3 h-3" />
                            {c.label}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
                {byStatus(col.key).length === 0 && (
                  <div className="border border-dashed border-char-3 rounded-xl p-4 text-center">
                    <p className="text-xs text-muted">Nenhuma tarefa</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
