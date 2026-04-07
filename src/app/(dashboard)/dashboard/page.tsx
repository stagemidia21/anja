import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MessageSquare, CheckSquare, Calendar, ArrowRight, Zap } from 'lucide-react'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, tasksRes, messagesRes, usageRes] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase.from('tasks').select('status').eq('user_id', user!.id),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
    supabase
      .from('usage_monthly')
      .select('message_count')
      .eq('user_id', user!.id)
      .eq('year_month', new Date().toISOString().slice(0, 7))
      .single(),
  ])

  const name = profileRes.data?.full_name?.split(' ')[0] || user!.email?.split('@')[0] || 'você'
  const tasks = tasksRes.data ?? []
  const totalTasks = tasks.length
  const pendingTasks = tasks.filter((t) => t.status === 'fazer').length
  const doingTasks = tasks.filter((t) => t.status === 'fazendo').length
  const totalMessages = messagesRes.count ?? 0
  const msgThisMonth = usageRes.data?.message_count ?? 0

  const greeting = getGreeting()

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Saudação */}
      <div>
        <h1 className="text-2xl font-semibold text-cream">
          {greeting}, {name}.
        </h1>
        <p className="text-muted text-sm mt-1">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Anja CTA */}
      <Link href="/chat">
        <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 flex items-center justify-between hover:bg-gold/15 transition-colors cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
              <span className="font-display text-gold text-lg font-normal">A</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-cream">Falar com a Anja</p>
              <p className="text-xs text-muted mt-0.5">Sua secretária executiva está pronta</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gold group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-char-2 border border-char-3 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare className="w-4 h-4 text-gold" />
            <span className="text-xs text-muted uppercase tracking-wide">Tarefas</span>
          </div>
          <p className="text-2xl font-semibold text-cream">{totalTasks}</p>
          <p className="text-xs text-muted mt-1">
            {pendingTasks} pendente{pendingTasks !== 1 ? 's' : ''}
            {doingTasks > 0 ? ` · ${doingTasks} em andamento` : ''}
          </p>
        </div>

        <div className="bg-char-2 border border-char-3 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-gold" />
            <span className="text-xs text-muted uppercase tracking-wide">Mensagens</span>
          </div>
          <p className="text-2xl font-semibold text-cream">{totalMessages}</p>
          <p className="text-xs text-muted mt-1">{msgThisMonth} este mês</p>
        </div>

        <div className="bg-char-2 border border-char-3 rounded-xl p-4 col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-gold" />
            <span className="text-xs text-muted uppercase tracking-wide">Agenda</span>
          </div>
          <p className="text-2xl font-semibold text-cream">—</p>
          <p className="text-xs text-muted mt-1">Integração em breve</p>
        </div>
      </div>

      {/* Ações rápidas */}
      <div>
        <h2 className="text-xs text-muted uppercase tracking-wide mb-3">Ações rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Link href="/chat">
            <div className="bg-char-2 border border-char-3 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-gold/30 transition-colors group">
              <MessageSquare className="w-4 h-4 text-gold" />
              <span className="text-sm text-cream">Nova mensagem para Anja</span>
              <ArrowRight className="w-3 h-3 text-muted ml-auto group-hover:text-gold transition-colors" />
            </div>
          </Link>
          <Link href="/tarefas">
            <div className="bg-char-2 border border-char-3 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-gold/30 transition-colors group">
              <CheckSquare className="w-4 h-4 text-gold" />
              <span className="text-sm text-cream">Ver tarefas</span>
              <ArrowRight className="w-3 h-3 text-muted ml-auto group-hover:text-gold transition-colors" />
            </div>
          </Link>
          <Link href="/agenda">
            <div className="bg-char-2 border border-char-3 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-gold/30 transition-colors group">
              <Calendar className="w-4 h-4 text-gold" />
              <span className="text-sm text-cream">Abrir agenda</span>
              <ArrowRight className="w-3 h-3 text-muted ml-auto group-hover:text-gold transition-colors" />
            </div>
          </Link>
          <Link href="/chat">
            <div className="bg-char-2 border border-char-3 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-gold/30 transition-colors group">
              <Zap className="w-4 h-4 text-gold" />
              <span className="text-sm text-cream">Criar tarefa com Anja</span>
              <ArrowRight className="w-3 h-3 text-muted ml-auto group-hover:text-gold transition-colors" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
