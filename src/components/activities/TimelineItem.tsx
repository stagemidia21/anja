import { renderMarkdown } from './markdown'
import type { TimelineActivity } from '@/lib/crm/activities'

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  note:         { label: 'Nota',                icon: '📝', color: 'text-cream/80' },
  call:         { label: 'Ligacao',             icon: '📞', color: 'text-blue-400' },
  meeting:      { label: 'Reuniao',             icon: '📅', color: 'text-purple-400' },
  email:        { label: 'E-mail',              icon: '✉️', color: 'text-cream/80' },
  whatsapp:     { label: 'WhatsApp',            icon: '💬', color: 'text-emerald-400' },
  task:         { label: 'Tarefa',              icon: '✅', color: 'text-cream/70' },
  stage_change: { label: 'Mudanca de estagio',  icon: '🔄', color: 'text-gold' },
  system:       { label: 'Sistema',             icon: 'ℹ️', color: 'text-cream/50' },
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function outcomeLabel(o: string): string {
  const map: Record<string, string> = {
    connected: 'Atendeu', voicemail: 'Caixa postal', no_answer: 'Sem resposta',
    rescheduled: 'Remarcada', completed: 'Concluida',
  }
  return map[o] ?? o
}

export function TimelineItem({ item }: { item: TimelineActivity }) {
  const meta = TYPE_META[item.type] ?? TYPE_META.system
  const ts = formatTime(item.occurred_at)

  return (
    <div className="bg-char-2 border border-char-3 rounded-lg p-4 flex gap-3">
      <div className="text-xl leading-none mt-0.5" aria-hidden>{meta.icon}</div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs uppercase tracking-wider ${meta.color}`}>
          {meta.label}
          <span className="text-cream/40 ml-2 normal-case tracking-normal">{ts}</span>
        </div>
        {item.type === 'note' && item.body && (
          <div
            className="text-sm text-cream/90 mt-1 max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(item.body) }}
          />
        )}
        {item.type === 'call' && (
          <div className="text-sm text-cream/80 mt-1">
            {item.outcome && <span className="inline-block text-xs bg-char-3 text-cream/70 rounded px-1.5 py-0.5 mr-2">{outcomeLabel(item.outcome)}</span>}
            {item.duration_minutes != null && <span className="text-cream/60 text-xs">{item.duration_minutes} min</span>}
            {item.body && <p className="mt-1">{item.body}</p>}
          </div>
        )}
        {item.type === 'meeting' && (
          <div className="text-sm text-cream/80 mt-1">
            {item.duration_minutes != null && <span className="text-cream/60 text-xs">{item.duration_minutes} min</span>}
            {item.body && <p className="mt-1 whitespace-pre-wrap">{item.body}</p>}
          </div>
        )}
        {item.type === 'stage_change' && (
          <div className="text-sm text-cream/70 mt-1">Estagio alterado</div>
        )}
        {(item.type === 'email' || item.type === 'whatsapp') && item.body && (
          <p className="text-sm text-cream/80 mt-1 line-clamp-3">{item.body}</p>
        )}
        {item.type === 'task' && item.body && (
          <p className="text-sm text-cream/80 mt-1">{item.body}</p>
        )}
      </div>
    </div>
  )
}
