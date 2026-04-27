'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import type { UIMessage } from 'ai'
import { createBrowserClient } from '@/lib/supabase/client'
import { saveMessages } from '@/lib/chat/persistence'
import { MessageBubble } from './message-bubble'
import { InputBar } from './input-bar'
import { Calendar, CheckSquare, Zap, Clock } from 'lucide-react'

const QUICK_ACTIONS = [
  { icon: Calendar,    label: 'Agendar reunião amanhã de manhã' },
  { icon: CheckSquare, label: 'Quais são minhas tarefas pendentes?' },
  { icon: Zap,         label: 'Me dá um resumo do dia' },
  { icon: Clock,       label: 'Reserve 30min para planejamento hoje' },
]

interface ChatWindowProps {
  initialMessages?: UIMessage[]
  sessionId?: string | null
  userId?: string
  onTitleUpdate?: (sessionId: string, title: string) => void
  onSessionUpdate?: (sessionId: string) => void
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-1">
      <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
        <span className="font-display text-gold text-sm">A</span>
      </div>
      <div className="bg-char-2 border border-char-3 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}

export function ChatWindow({ initialMessages = [], sessionId, userId, onTitleUpdate, onSessionUpdate }: ChatWindowProps) {
  const supabase = createBrowserClient()
  const [streamError, setStreamError] = useState(false)
  const { messages, sendMessage, status } = useChat({
    messages: initialMessages,
    onError: () => setStreamError(true),
  })
  const isLoading = status === 'streaming' || status === 'submitted'
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const titleSetRef = useRef(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Salva mensagens e auto-titula sessão após resposta completa
  const handleFinished = useCallback(async (msgs: UIMessage[]) => {
    if (!userId) return
    await saveMessages(supabase, userId, msgs, sessionId ?? undefined)
    if (sessionId) onSessionUpdate?.(sessionId)

    // Auto-título: primeira mensagem do user
    if (!titleSetRef.current && sessionId && onTitleUpdate) {
      const firstUser = msgs.find(m => m.role === 'user')
      if (firstUser) {
        const text = firstUser.parts
          .filter(p => p.type === 'text')
          .map(p => (p as { type: 'text'; text: string }).text)
          .join('')
          .trim()
          .slice(0, 60)
        if (text) {
          titleSetRef.current = true
          onTitleUpdate(sessionId, text)
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, userId])

  useEffect(() => {
    if (status === 'ready' && messages.length > 0) {
      handleFinished(messages)
    }
  }, [status, messages, handleFinished])

  function handleSend(text: string) {
    setStreamError(false)
    sendMessage({ text })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-6">
            <div>
              <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
                <span className="font-display text-gold text-3xl font-light">A</span>
              </div>
              <h2 className="font-display text-gold text-2xl font-normal">Olá, sou a Anja.</h2>
              <p className="text-muted text-sm mt-1.5 max-w-xs mx-auto">
                Sua secretária executiva com IA. Posso criar eventos, gerenciar tarefas e muito mais.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
              {QUICK_ACTIONS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={() => handleSend(label)}
                  className="flex items-center gap-2.5 bg-char-2 border border-char-3 hover:border-gold/30 text-left px-3.5 py-2.5 rounded-xl transition-colors group"
                >
                  <Icon className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                  <span className="text-xs text-muted group-hover:text-cream transition-colors leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && <TypingIndicator />}
          </div>
        )}

        {(status === 'error' || streamError) && (
          <p className="text-xs text-danger text-center py-2 mt-2">
            Algo deu errado. Tenta novamente.
          </p>
        )}
        <div ref={messagesEndRef} />
      </div>

      <InputBar onSend={handleSend} isLoading={isLoading} />
    </div>
  )
}
