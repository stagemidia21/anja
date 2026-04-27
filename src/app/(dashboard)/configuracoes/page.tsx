'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { MessageCircle, User, LogOut, Check, Calendar, ChevronRight, Key } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'

const inputCls = "w-full bg-charcoal border border-char-3 rounded-lg px-3 py-2 text-sm text-cream placeholder:text-muted focus:outline-none focus:border-gold/50"

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-char-2 border border-char-3 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted" />
        <span className="text-sm font-semibold text-cream">{title}</span>
      </div>
      {children}
    </div>
  )
}

function SaveRow({ saving, saved, onClick, disabled }: {
  saving: boolean; saved: boolean; onClick: () => void; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={saving || disabled}
      className="flex items-center gap-1.5 px-4 py-2 bg-gold text-charcoal text-sm font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40 btn-press self-start"
    >
      {saved ? <><Check className="w-3.5 h-3.5" />Salvo</> : saving ? 'Salvando...' : 'Salvar'}
    </button>
  )
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <p className="text-xs text-muted mb-1">{label}</p>
      {children}
      {hint && <p className="text-xs text-muted/60 mt-1">{hint}</p>}
    </div>
  )
}

export default function ConfiguracoesPage() {
  const supabase = createBrowserClient()
  const router = useRouter()
  const toast = useToast()
  const [userId, setUserId] = useState<string | null>(null)

  // Conta
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [savedName, setSavedName] = useState(false)

  // Senha
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [savedPassword, setSavedPassword] = useState(false)

  // Telegram
  const [telegramId, setTelegramId] = useState('')
  const [savingTelegram, setSavingTelegram] = useState(false)
  const [savedTelegram, setSavedTelegram] = useState(false)

  // Calendário
  const [calendarId, setCalendarId] = useState('')
  const [savingCal, setSavingCal] = useState(false)
  const [savedCal, setSavedCal] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return
      setUserId(u.id)
      setEmail(u.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, telegram_chat_id, google_calendar_id')
        .eq('id', u.id)
        .single()

      const n = profile?.full_name ?? u.email?.split('@')[0] ?? ''
      setName(n); setNameInput(n)
      setTelegramId(profile?.telegram_chat_id ?? '')
      if (profile?.google_calendar_id) setCalendarId(profile.google_calendar_id)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSaveName() {
    if (!userId || !nameInput.trim()) return
    setSavingName(true)
    const { error } = await supabase.from('profiles').update({ full_name: nameInput.trim() }).eq('id', userId)
    if (error) { toast.error('Erro ao salvar nome'); setSavingName(false); return }
    setName(nameInput.trim())
    setSavingName(false); setSavedName(true)
    setTimeout(() => setSavedName(false), 2000)
  }

  async function handleSavePassword() {
    if (newPassword !== confirmPassword) { toast.error('As senhas não coincidem'); return }
    if (newPassword.length < 8) { toast.error('Senha deve ter ao menos 8 caracteres'); return }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { toast.error('Erro ao alterar senha: ' + error.message); setSavingPassword(false); return }
    setNewPassword(''); setConfirmPassword('')
    setSavingPassword(false); setSavedPassword(true)
    toast.success('Senha alterada')
    setTimeout(() => setSavedPassword(false), 2000)
  }

  async function handleSaveTelegram() {
    if (!userId) return
    setSavingTelegram(true)
    const { error } = await supabase.from('profiles').update({ telegram_chat_id: telegramId }).eq('id', userId)
    if (error) { toast.error('Erro ao salvar Telegram'); setSavingTelegram(false); return }
    setSavingTelegram(false); setSavedTelegram(true)
    setTimeout(() => setSavedTelegram(false), 2000)
  }

  async function handleSaveCalendar() {
    if (!userId) return
    setSavingCal(true)
    const { error } = await supabase.from('profiles').update({ google_calendar_id: calendarId.trim() || null }).eq('id', userId)
    if (error) { toast.error('Erro ao salvar calendário'); setSavingCal(false); return }
    setSavingCal(false); setSavedCal(true)
    toast.success('Calendário atualizado')
    setTimeout(() => setSavedCal(false), 2000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-base font-semibold text-cream">Configurações</h1>
        <p className="text-xs text-muted mt-0.5">Conta, integrações e preferências</p>
      </div>

      {/* Conta */}
      <Section icon={User} title="Conta">
        <Field label="Nome">
          <div className="flex gap-2">
            <input
              type="text" value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              placeholder="Seu nome"
              className={inputCls}
            />
            <SaveRow saving={savingName} saved={savedName} onClick={handleSaveName} disabled={!nameInput.trim() || nameInput === name} />
          </div>
        </Field>

        <Field label="E-mail">
          <p className="text-sm text-cream py-2">{email || '—'}</p>
        </Field>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-muted hover:text-danger transition-colors btn-press"
        >
          <LogOut className="w-4 h-4" />
          Sair da conta
        </button>
      </Section>

      {/* Senha */}
      <Section icon={Key} title="Alterar senha">
        <Field label="Nova senha">
          <input
            type="password" value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className={inputCls}
          />
        </Field>
        <Field label="Confirmar senha">
          <input
            type="password" value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSavePassword()}
            placeholder="Repita a nova senha"
            className={inputCls}
          />
        </Field>
        <SaveRow
          saving={savingPassword} saved={savedPassword} onClick={handleSavePassword}
          disabled={!newPassword || !confirmPassword}
        />
      </Section>

      {/* Google Calendar */}
      <Section icon={Calendar} title="Google Calendar">
        <p className="text-xs text-muted -mt-2">
          Por padrão a Anja usa o calendário configurado na conta do servidor.
          Para usar seu próprio calendário, compartilhe-o com a service account e cole o ID abaixo.
        </p>

        <Field
          label="ID do calendário"
          hint="Exemplo: nome@gmail.com ou id-longo@group.calendar.google.com"
        >
          <input
            type="text" value={calendarId}
            onChange={e => setCalendarId(e.target.value)}
            placeholder="Deixe em branco para usar o padrão"
            className={inputCls}
          />
        </Field>

        {calendarId && (
          <div className="flex items-start gap-2 bg-gold/5 border border-gold/20 rounded-lg p-3 text-xs text-muted">
            <ChevronRight className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
            <span>
              Compartilhe este calendário com permissão de <strong className="text-cream">edição</strong> para
              a service account configurada no servidor antes de salvar.
            </span>
          </div>
        )}

        <SaveRow saving={savingCal} saved={savedCal} onClick={handleSaveCalendar} />
      </Section>

      {/* Telegram */}
      <Section icon={MessageCircle} title="Telegram">
        <p className="text-xs text-muted -mt-2">
          Conecte sua conta do Telegram para receber lembretes e interagir com a Anja por mensagem.
        </p>

        <Field label="Chat ID">
          <div className="flex gap-2">
            <input
              type="text" value={telegramId}
              onChange={e => setTelegramId(e.target.value)}
              placeholder="Ex: 907998185"
              className={inputCls}
            />
            <SaveRow saving={savingTelegram} saved={savedTelegram} onClick={handleSaveTelegram} />
          </div>
        </Field>

        <p className="text-xs text-muted">
          Envie <span className="font-mono bg-char-3 px-1.5 py-0.5 rounded text-cream">/start</span> para
          o bot Anja no Telegram e cole o ID que ele retornar acima.
        </p>
      </Section>
    </div>
  )
}
