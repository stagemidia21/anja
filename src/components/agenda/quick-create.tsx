'use client'

import { useState } from 'react'
import { Plus, X, CalendarPlus } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface Props {
  defaultDate?: string // YYYY-MM-DD
}

const DURATIONS = [
  { value: 15, label: '15 min' }, { value: 30, label: '30 min' },
  { value: 45, label: '45 min' }, { value: 60, label: '1h' },
  { value: 90, label: '1h30' }, { value: 120, label: '2h' },
]

// Google Calendar colorId 1-11
const GCal_COLORS = [
  { id: '1',  hex: '#7986CB', label: 'Lavanda' },
  { id: '2',  hex: '#33B679', label: 'Sálvia' },
  { id: '3',  hex: '#8E24AA', label: 'Uva' },
  { id: '4',  hex: '#E67C73', label: 'Flamingo' },
  { id: '5',  hex: '#F6BF26', label: 'Banana' },
  { id: '6',  hex: '#F4511E', label: 'Tangerina' },
  { id: '7',  hex: '#039BE5', label: 'Pavão' },
  { id: '8',  hex: '#616161', label: 'Grafite' },
  { id: '9',  hex: '#3F51B5', label: 'Mirtilo' },
  { id: '10', hex: '#0B8043', label: 'Manjericão' },
  { id: '11', hex: '#D50000', label: 'Tomate' },
]

export function AgendaQuickCreate({ defaultDate }: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const todayStr = defaultDate ?? new Date().toISOString().slice(0, 10)
  const nowH = new Date().getHours()
  const nextH = Math.min(nowH + 1, 22)
  const defaultStart = `${todayStr}T${String(nextH).padStart(2, '0')}:00`

  const [form, setForm] = useState({
    title: '',
    start: defaultStart,
    duration: 30,
    description: '',
    colorId: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    const start = new Date(form.start)
    const end = new Date(start.getTime() + form.duration * 60000)
    const res = await fetch('/api/calendar/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim(),
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
        ...(form.colorId ? { colorId: form.colorId } : {}),
      }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Evento criado na agenda')
      setOpen(false)
      setForm(f => ({ ...f, title: '', description: '' }))
    } else {
      const err = await res.json()
      toast.error('Erro: ' + (err.error ?? res.statusText))
    }
  }

  const inputCls = "w-full bg-charcoal border border-char-3 text-cream text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-gold/50 placeholder:text-muted"

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs bg-gold text-charcoal font-semibold px-3 py-1.5 rounded-lg hover:bg-gold-light transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Novo evento
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
          <div className="absolute inset-0 bg-charcoal/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <form
            onSubmit={handleSubmit}
            className="relative bg-char-2 border border-char-3 rounded-2xl w-full max-w-md shadow-2xl fade-up"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-char-3">
              <div className="flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-gold" />
                <h3 className="text-sm font-semibold text-cream">Novo evento</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-cream transition-colors p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted mb-1 block">Título</label>
                <input
                  autoFocus
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Nome do evento..."
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">Data e hora</label>
                  <input
                    type="datetime-local"
                    value={form.start}
                    onChange={e => setForm(f => ({ ...f, start: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">Duração</label>
                  <select
                    value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}
                    className={inputCls}
                  >
                    {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted mb-1 block">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, colorId: '' }))}
                    title="Padrão"
                    className={`w-6 h-6 rounded-full border-2 transition-all bg-gold/40 ${
                      form.colorId === '' ? 'border-cream scale-110' : 'border-transparent hover:scale-110'
                    }`}
                  />
                  {GCal_COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, colorId: c.id }))}
                      title={c.label}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        form.colorId === c.id ? 'border-cream scale-110' : 'border-transparent hover:scale-110'
                      }`}
                      style={{ background: c.hex }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted mb-1 block">Descrição (opcional)</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Contexto, link, notas..."
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>

            <div className="flex gap-2 px-5 py-4 border-t border-char-3">
              <button
                type="submit"
                disabled={saving || !form.title.trim()}
                className="bg-gold text-charcoal text-sm font-semibold px-5 py-2 rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40 flex-1"
              >
                {saving ? 'Criando...' : 'Criar evento'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted text-sm hover:text-cream transition-colors px-4"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
