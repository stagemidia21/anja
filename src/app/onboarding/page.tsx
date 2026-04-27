'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { Check, ChevronRight, Calendar, MessageCircle, Clock, Sparkles } from 'lucide-react'

const STEPS = [
  { id: 'welcome',   label: 'Boas-vindas' },
  { id: 'profile',   label: 'Perfil' },
  { id: 'schedule',  label: 'Horários' },
  { id: 'telegram',  label: 'Telegram' },
  { id: 'done',      label: 'Pronto' },
]

const WEEK_DAYS = [
  { idx: 1, short: 'Seg' },
  { idx: 2, short: 'Ter' },
  { idx: 3, short: 'Qua' },
  { idx: 4, short: 'Qui' },
  { idx: 5, short: 'Sex' },
  { idx: 6, short: 'Sáb' },
  { idx: 0, short: 'Dom' },
]

const inputCls = "w-full bg-charcoal border border-char-3 rounded-lg px-3 py-2.5 text-sm text-cream placeholder:text-muted focus:outline-none focus:border-gold/60 transition-colors"

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Dados coletados
  const [name, setName] = useState('')
  const [workStart, setWorkStart] = useState('08:00')
  const [workEnd, setWorkEnd] = useState('18:00')
  const [lunchStart, setLunchStart] = useState('12:00')
  const [lunchEnd, setLunchEnd] = useState('13:00')
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [telegramId, setTelegramId] = useState('')

  function toggleDay(idx: number) {
    setWorkDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx])
  }

  async function finish() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    await supabase.from('profiles').update({
      full_name: name.trim() || undefined,
      work_start: workStart,
      work_end: workEnd,
      lunch_start: lunchStart,
      lunch_end: lunchEnd,
      work_days: workDays,
      telegram_chat_id: telegramId.trim() || null,
      onboarded_at: new Date().toISOString(),
    }).eq('id', user.id)

    router.push('/dashboard')
  }

  const current = STEPS[step]

  return (
    <div className="min-h-screen bg-charcoal grain flex flex-col items-center justify-center px-5 py-10">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
              i < step ? 'bg-gold text-charcoal' :
              i === step ? 'bg-gold/20 border border-gold text-gold' :
              'bg-char-3 text-muted'
            }`}>
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-px transition-all ${i < step ? 'bg-gold' : 'bg-char-3'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-char-2 border border-char-3 rounded-2xl shadow-2xl overflow-hidden fade-up">

        {/* Welcome */}
        {current.id === 'welcome' && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-2">
              <Sparkles className="w-7 h-7 text-gold" />
            </div>
            <h1 className="font-display text-3xl font-medium text-cream">Bem-vindo à Anja</h1>
            <p className="text-muted text-sm leading-relaxed">
              Sua secretária executiva com IA. Em menos de 2 minutos você configura tudo e começa a usar.
            </p>
            <div className="space-y-2 pt-2 text-left">
              {[
                { icon: Calendar, text: 'Gerencie agenda e tarefas por mensagem' },
                { icon: Clock, text: 'Receba lembretes antes dos seus compromissos' },
                { icon: MessageCircle, text: 'Converse pelo Telegram ou pelo app' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm text-muted">
                  <Icon className="w-4 h-4 text-gold flex-shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile */}
        {current.id === 'profile' && (
          <div className="p-8 space-y-5">
            <div>
              <h2 className="font-display text-2xl font-medium text-cream mb-1">Como posso te chamar?</h2>
              <p className="text-sm text-muted">A Anja vai usar esse nome nas mensagens.</p>
            </div>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(s => s + 1)}
              placeholder="Seu nome ou apelido"
              className={inputCls}
            />
          </div>
        )}

        {/* Schedule */}
        {current.id === 'schedule' && (
          <div className="p-8 space-y-5">
            <div>
              <h2 className="font-display text-2xl font-medium text-cream mb-1">Seu horário de trabalho</h2>
              <p className="text-sm text-muted">Usado para sugerir horários e encontrar slots livres.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted mb-1">Início</p>
                <input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)} className={inputCls} />
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Fim</p>
                <input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)} className={inputCls} />
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Almoço início</p>
                <input type="time" value={lunchStart} onChange={e => setLunchStart(e.target.value)} className={inputCls} />
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Almoço fim</p>
                <input type="time" value={lunchEnd} onChange={e => setLunchEnd(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted mb-2">Dias de trabalho</p>
              <div className="flex gap-2 flex-wrap">
                {WEEK_DAYS.map(d => (
                  <button
                    key={d.idx}
                    onClick={() => toggleDay(d.idx)}
                    className={`w-10 h-10 rounded-lg text-xs font-medium transition-all btn-press ${
                      workDays.includes(d.idx) ? 'bg-gold text-charcoal' : 'bg-char-3 text-muted hover:text-cream'
                    }`}
                  >
                    {d.short}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Telegram */}
        {current.id === 'telegram' && (
          <div className="p-8 space-y-5">
            <div>
              <h2 className="font-display text-2xl font-medium text-cream mb-1">Conectar Telegram</h2>
              <p className="text-sm text-muted">
                Opcional. Permite receber lembretes e conversar com a Anja pelo Telegram.
              </p>
            </div>
            <div className="bg-char-3/40 border border-char-3 rounded-xl p-4 space-y-2 text-sm">
              <p className="text-cream font-medium">Como obter seu Chat ID:</p>
              <ol className="text-muted space-y-1 list-decimal list-inside text-xs leading-relaxed">
                <li>Abra o Telegram e busque pelo bot <strong className="text-cream">@AnjaAssistente_bot</strong></li>
                <li>Envie <span className="font-mono bg-char-3 px-1 rounded">/start</span></li>
                <li>Cole o número que ele retornar abaixo</li>
              </ol>
            </div>
            <input
              type="text"
              value={telegramId}
              onChange={e => setTelegramId(e.target.value)}
              placeholder="Ex: 907998185 (pode pular por agora)"
              className={inputCls}
            />
            <p className="text-xs text-muted/60">
              Você pode configurar isso depois em Configurações.
            </p>
          </div>
        )}

        {/* Done */}
        {current.id === 'done' && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/10 border border-success/30 flex items-center justify-center mx-auto mb-2">
              <Check className="w-7 h-7 text-success" />
            </div>
            <h2 className="font-display text-2xl font-medium text-cream">Tudo pronto{name ? `, ${name.split(' ')[0]}` : ''}!</h2>
            <p className="text-sm text-muted leading-relaxed">
              A Anja está configurada. Acesse o dashboard para começar a organizar sua agenda e tarefas.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="px-8 pb-8 flex items-center justify-between gap-3">
          {step > 0 && current.id !== 'done' ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="text-sm text-muted hover:text-cream transition-colors"
            >
              Voltar
            </button>
          ) : <div />}

          {current.id === 'done' ? (
            <button
              onClick={finish}
              disabled={saving}
              className="flex items-center gap-2 bg-gold hover:bg-gold-light text-charcoal font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 btn-press ml-auto"
            >
              {saving ? 'Entrando...' : 'Ir para o Dashboard'}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => step === STEPS.length - 2 ? setStep(s => s + 1) : setStep(s => s + 1)}
              className="flex items-center gap-2 bg-gold hover:bg-gold-light text-charcoal font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors btn-press ml-auto"
            >
              {current.id === 'telegram' ? 'Concluir' : 'Continuar'}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <p className="mt-8 text-muted/40 text-xs tracking-widest uppercase">Anja</p>
    </div>
  )
}
