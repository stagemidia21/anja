import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'
import { MessageSquare, CheckSquare, Calendar, ArrowRight, Zap, Clock, TrendingUp, AlertTriangle, RefreshCw, Check, Brain } from 'lucide-react'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

async function getTodayEvents() {
  try {
    const SA_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n')
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: SA_KEY,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })
    const cal = google.calendar({ version: 'v3', auth })
    const today = new Date().toISOString().slice(0, 10)
    const res = await cal.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'stagemidia21@gmail.com',
      timeMin: new Date(`${today}T00:00:00-03:00`).toISOString(),
      timeMax: new Date(`${today}T23:59:59-03:00`).toISOString(),
      singleEvents: true, orderBy: 'startTime', maxResults: 10,
    })
    return (res.data.items ?? []).map(e => ({
      id: e.id ?? '',
      title: e.summary ?? '(sem título)',
      start: e.start?.dateTime ?? e.start?.date ?? '',
      end: e.end?.dateTime ?? e.end?.date ?? '',
      htmlLink: e.htmlLink ?? '',
    }))
  } catch { return [] }
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function StatCard({ icon: Icon, label, value, sub, accent = false, href }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; accent?: boolean; href?: string
}) {
  const cls = `rounded-xl p-4 border transition-all duration-150 ${
    accent
      ? 'bg-gold/8 border-gold/25 hover:bg-gold/12 hover:border-gold/35'
      : 'bg-char-2 border-char-3 hover:border-char-3/80 hover:bg-char-2/80'
  }`
  const content = (
    <>
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className={`w-3.5 h-3.5 ${accent ? 'text-gold' : 'text-muted'}`} />
        <span className="text-[10px] text-muted uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className={`text-3xl font-semibold tabular-nums leading-none ${accent ? 'text-gold' : 'text-cream'}`}>{value}</p>
      {sub && <p className="text-xs text-muted mt-1.5 leading-tight">{sub}</p>}
    </>
  )
  return href
    ? <Link href={href} className={cls}>{content}</Link>
    : <div className={cls}>{content}</div>
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const todayIdx = new Date().getDay()
  const todayISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const nowISO = new Date().toISOString()

  const [profileRes, tasksRes, todayEvents, routinesRes, completionsRes] = await Promise.all([
    supabase.from('profiles').select('full_name, ai_memory').eq('id', user!.id).single(),
    supabase.from('tasks').select('id, title, status, priority, due_date, scheduled_at, duration_minutes, category').eq('user_id', user!.id),
    getTodayEvents(),
    supabase.from('routines').select('id, title, start_time, duration_minutes, days_of_week, active').eq('user_id', user!.id).eq('active', true).order('start_time'),
    supabase.from('routine_completions').select('routine_id').eq('user_id', user!.id).eq('completed_date', todayISO),
  ])

  const profile = profileRes.data as { full_name?: string; ai_memory?: string } | null
  const name = profile?.full_name?.split(' ')[0] || user!.email?.split('@')[0] || 'você'
  const aiMemory = profile?.ai_memory ?? null
  const tasks = tasksRes.data ?? []
  const routines = (routinesRes.data ?? []) as { id: string; title: string; start_time: string; duration_minutes: number; days_of_week: number[]; active: boolean }[]
  const completedIds = new Set((completionsRes.data ?? []).map((c: { routine_id: string }) => c.routine_id))

  const pending = tasks.filter(t => t.status !== 'feito')
  const doing = tasks.filter(t => t.status === 'fazendo')
  const done = tasks.filter(t => t.status === 'feito')
  const alta = pending.filter(t => t.priority === 'alta')
  const today = new Date().toISOString().slice(0, 10)
  const overdue = pending.filter(t => t.due_date && t.due_date < today)

  // Rotinas do dia
  const rotinasHoje = routines.filter(r => r.days_of_week.includes(todayIdx))
  const rotinasFeitas = rotinasHoje.filter(r => completedIds.has(r.id)).length

  // Timeline unificada: eventos Calendar + rotinas de hoje, ordenados por horário
  type TimelineItem =
    | { type: 'event'; id: string; title: string; start: string; end: string; htmlLink: string; isPast: boolean }
    | { type: 'routine'; id: string; title: string; start: string; end: string; done: boolean }

  const timelineItems: TimelineItem[] = [
    ...todayEvents.map(e => ({
      type: 'event' as const,
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      htmlLink: e.htmlLink,
      isPast: e.end <= nowISO,
    })),
    ...rotinasHoje.map(r => {
      const [h, m] = r.start_time.split(':').map(Number)
      const startDt = new Date(); startDt.setHours(h, m, 0, 0)
      const endDt = new Date(startDt.getTime() + r.duration_minutes * 60000)
      return {
        type: 'routine' as const,
        id: r.id,
        title: r.title,
        start: startDt.toISOString(),
        end: endDt.toISOString(),
        done: completedIds.has(r.id),
      }
    }),
  ].sort((a, b) => a.start.localeCompare(b.start))

  const upcomingTimeline = timelineItems.filter(i => i.type === 'event' ? !i.isPast : !i.done)
  const prioColor: Record<string, string> = { alta: 'bg-danger', media: 'bg-gold', baixa: 'bg-muted' }

  // Progresso do dia: tarefas feitas + rotinas feitas
  const totalDayItems = tasks.length + rotinasHoje.length
  const doneDayItems = done.length + rotinasFeitas
  const dayProgress = totalDayItems > 0 ? Math.round(doneDayItems / totalDayItems * 100) : 0

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Saudação */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted capitalize">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-xl font-semibold text-cream mt-0.5">{getGreeting()}, {name}.</h1>
        </div>
        <Link href="/chat"
          className="flex items-center gap-1.5 bg-gold text-charcoal text-xs font-semibold px-3 py-2 rounded-lg hover:bg-gold-light transition-colors">
          <MessageSquare className="w-3.5 h-3.5" />
          Falar com Anja
        </Link>
      </div>

      {/* Onboarding — sem dados ainda */}
      {tasks.length === 0 && todayEvents.length === 0 && routines.length === 0 && (
        <div className="bg-gold/5 border border-gold/20 rounded-xl p-5">
          <p className="text-sm font-semibold text-cream mb-1">Comece por aqui</p>
          <p className="text-xs text-muted mb-4">Você ainda não tem tarefas, rotinas nem eventos. Configure sua agenda com a Anja.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { href: '/chat',    label: 'Falar com a Anja',   sub: 'Crie tarefas e eventos pelo chat' },
              { href: '/tarefas', label: 'Criar tarefa',        sub: 'Gerencie o que precisa fazer' },
              { href: '/rotinas', label: 'Montar rotinas',      sub: 'Configure sua rotina diária' },
            ].map(({ href, label, sub }) => (
              <Link key={href} href={href}
                className="bg-char-2 border border-char-3 hover:border-gold/30 rounded-lg px-4 py-3 transition-colors group">
                <p className="text-xs font-semibold text-cream group-hover:text-gold transition-colors">{label} →</p>
                <p className="text-[10px] text-muted mt-0.5">{sub}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Alertas */}
      {(overdue.length > 0 || alta.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {overdue.length > 0 && (
            <Link href="/tarefas" className="flex-1 flex items-center gap-2.5 bg-danger/8 border border-danger/25 rounded-xl px-4 py-2.5 hover:bg-danger/12 transition-colors">
              <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-danger">{overdue.length} tarefa{overdue.length > 1 ? 's atrasadas' : ' atrasada'}</p>
                <p className="text-xs text-danger/70">{overdue[0].title}{overdue.length > 1 ? ` e mais ${overdue.length - 1}` : ''}</p>
              </div>
            </Link>
          )}
          {alta.length > 0 && (
            <Link href="/tarefas" className="flex-1 flex items-center gap-2.5 bg-gold/8 border border-gold/25 rounded-xl px-4 py-2.5 hover:bg-gold/12 transition-colors">
              <TrendingUp className="w-4 h-4 text-gold flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gold">{alta.length} tarefa{alta.length > 1 ? 's' : ''} de alta prioridade</p>
                <p className="text-xs text-gold/70">{alta[0].title}{alta.length > 1 ? ` e mais ${alta.length - 1}` : ''}</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={CheckSquare} label="Pendentes" value={pending.length} href="/tarefas"
          sub={doing.length > 0 ? `${doing.length} em andamento` : overdue.length > 0 ? `${overdue.length} atrasada${overdue.length > 1 ? 's' : ''}` : 'tudo em dia'} />
        <StatCard icon={RefreshCw} label="Rotinas hoje" value={`${rotinasFeitas}/${rotinasHoje.length}`} href="/rotinas"
          sub={rotinasHoje.length === 0 ? 'sem rotinas hoje' : rotinasFeitas === rotinasHoje.length ? 'todas concluídas ✓' : `${rotinasHoje.length - rotinasFeitas} restante${rotinasHoje.length - rotinasFeitas > 1 ? 's' : ''}`} />
        <StatCard icon={Calendar} label="Agenda hoje" value={todayEvents.length} href="/agenda"
          sub={upcomingTimeline.filter(i => i.type === 'event').length > 0 ? `${upcomingTimeline.filter(i => i.type === 'event').length} por vir` : todayEvents.length > 0 ? 'todos passados' : 'dia livre'} />
        <StatCard icon={Zap} label="Progresso" value={`${dayProgress}%`} accent
          sub={`${doneDayItems} de ${totalDayItems} itens concluídos`} />
      </div>

      {/* Barra de progresso do dia */}
      {totalDayItems > 0 && (
        <div className="h-1 bg-char-3 rounded-full overflow-hidden">
          <div className="h-full bg-gold rounded-full transition-all duration-500"
            style={{ width: `${dayProgress}%` }} />
        </div>
      )}

      {/* Timeline unificada do dia */}
      {timelineItems.length > 0 && (
        <div className="bg-char-2 border border-char-3 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted" />
              <span className="text-xs font-semibold text-cream">Timeline de hoje — {DAYS[todayIdx]}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gold/60 inline-block" /> evento
              </span>
              <span className="text-[10px] text-muted flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gold/30 border border-gold/40 inline-block" /> rotina
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            {timelineItems.map((item, idx) => {
              const time = item.start.includes('T')
                ? new Date(item.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                : 'dia todo'
              const isPast = item.type === 'event' ? item.isPast : item.done
              const isNext = !isPast && timelineItems.slice(0, idx).every(i => i.type === 'event' ? i.isPast : i.done)

              if (item.type === 'event') {
                return (
                  <a key={`e-${item.id}`} href={item.htmlLink} target="_blank" rel="noopener noreferrer"
                    className={`flex items-center gap-3 group py-1 rounded-lg px-2 -mx-2 transition-colors ${isPast ? 'opacity-40' : isNext ? 'bg-gold/5' : 'hover:bg-char-3/30'}`}>
                    <span className="text-xs tabular-nums flex-shrink-0 w-10 text-muted">{time}</span>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isPast ? 'bg-char-3' : 'bg-gold/70'}`} />
                    <span className={`text-xs flex-1 truncate ${isPast ? 'text-muted' : isNext ? 'text-cream font-medium' : 'text-cream group-hover:text-gold'}`}>{item.title}</span>
                    {isNext && <span className="text-[10px] text-gold bg-gold/10 px-1.5 py-0.5 rounded flex-shrink-0">próximo</span>}
                  </a>
                )
              } else {
                return (
                  <div key={`r-${item.id}`}
                    className={`flex items-center gap-3 py-1 rounded-lg px-2 -mx-2 ${isPast ? 'opacity-40' : isNext ? 'bg-gold/5' : ''}`}>
                    <span className="text-xs tabular-nums flex-shrink-0 w-10 text-muted">{time}</span>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 border ${isPast ? 'bg-gold/60 border-gold/60' : 'border-gold/40 bg-transparent'}`} />
                    <span className={`text-xs flex-1 truncate ${isPast ? 'line-through text-muted' : isNext ? 'text-cream font-medium' : 'text-muted'}`}>{item.title}</span>
                    {isNext && <span className="text-[10px] text-gold bg-gold/10 px-1.5 py-0.5 rounded flex-shrink-0">próxima</span>}
                    {isPast && <Check className="w-3 h-3 text-gold/60 flex-shrink-0" />}
                  </div>
                )
              }
            })}
          </div>
        </div>
      )}

      {/* Grid: tarefas + memória/ações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Tarefas pendentes */}
        <div className="bg-char-2 border border-char-3 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-muted" />
              <span className="text-xs font-semibold text-cream">Tarefas pendentes</span>
            </div>
            <Link href="/tarefas" className="text-[10px] text-muted hover:text-gold transition-colors">ver todas →</Link>
          </div>
          {pending.length === 0 ? (
            <div className="py-6 text-center space-y-2">
              <CheckSquare className="w-8 h-8 text-char-3 mx-auto" />
              <p className="text-xs text-muted">Nenhuma tarefa pendente.</p>
              <Link href="/chat" className="text-xs text-gold hover:text-gold-light transition-colors inline-block">
                Criar com a Anja →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {[...pending]
                .sort((a, b) => {
                  // atrasadas primeiro, depois alta, media, baixa
                  const aOverdue = a.due_date && a.due_date < today ? -1 : 0
                  const bOverdue = b.due_date && b.due_date < today ? -1 : 0
                  if (aOverdue !== bOverdue) return aOverdue - bOverdue
                  const pOrder: Record<string, number> = { alta: 0, media: 1, baixa: 2 }
                  return (pOrder[a.priority] ?? 3) - (pOrder[b.priority] ?? 3)
                })
                .slice(0, 6)
                .map(t => {
                  const isOverdue = t.due_date && t.due_date < today
                  const isToday = t.due_date === today
                  return (
                    <div key={t.id} className="flex items-center gap-2.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${prioColor[t.priority]}`} />
                      <span className={`text-xs flex-1 truncate ${isOverdue ? 'text-danger/90' : 'text-cream'}`}>{t.title}</span>
                      {isOverdue && <span className="text-[10px] text-danger flex-shrink-0">atrasada</span>}
                      {isToday && !isOverdue && <span className="text-[10px] text-gold flex-shrink-0">hoje</span>}
                      {t.category && !isOverdue && !isToday && (
                        <span className="text-[10px] text-muted bg-char-3 px-1.5 py-0.5 rounded flex-shrink-0">{t.category}</span>
                      )}
                    </div>
                  )
                })}
              {pending.length > 6 && (
                <Link href="/tarefas" className="text-[10px] text-muted hover:text-gold transition-colors pt-1 block">
                  + {pending.length - 6} outras tarefas →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Memória da Anja ou Ações rápidas */}
        {aiMemory ? (
          <div className="bg-char-2 border border-char-3 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Brain className="w-3.5 h-3.5 text-gold" />
              <span className="text-xs font-semibold text-cream">O que a Anja lembra</span>
            </div>
            <p className="text-xs text-muted leading-relaxed line-clamp-6">{aiMemory}</p>
            <Link href="/chat" className="mt-3 text-[10px] text-gold hover:text-gold-light transition-colors inline-block">
              Continuar conversa →
            </Link>
          </div>
        ) : (
          <div className="bg-char-2 border border-char-3 rounded-xl p-4">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-3">Ações rápidas</p>
            <div className="space-y-1.5">
              {[
                { icon: MessageSquare, label: 'Falar com Anja',           href: '/chat' },
                { icon: Zap,           label: 'Criar tarefa com Anja',    href: '/chat' },
                { icon: Calendar,      label: 'Agendar evento pela Anja', href: '/chat' },
                { icon: RefreshCw,     label: 'Gerenciar rotinas',        href: '/rotinas' },
                { icon: CheckSquare,   label: 'Ver todas as tarefas',     href: '/tarefas' },
              ].map(({ icon: Icon, label, href }) => (
                <Link key={label} href={href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-char-3/60 transition-colors group">
                  <Icon className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                  <span className="text-xs text-cream flex-1">{label}</span>
                  <ArrowRight className="w-3 h-3 text-muted group-hover:text-gold transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
