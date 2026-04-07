'use client'

import { useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import type { UIMessage } from 'ai'
import { MessageBubble } from './message-bubble'
import { InputBar } from './input-bar'

interface ChatWindowProps {
  initialMessages?: UIMessage[]
}

export function ChatWindow({ initialMessages = [] }: ChatWindowProps) {
  const { messages, sendMessage, status } = useChat({
    messages: initialMessages,
  })
  const isLoading = status === 'streaming' || status === 'submitted'
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend(text: string) {
    sendMessage({ text })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <h2 className="font-display text-gold text-2xl font-normal">Olá! Sou a Anja.</h2>
            <p className="text-muted text-sm mt-2">Como posso ajudar você hoje?</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        {status === 'error' && (
          <p className="text-sm text-danger text-center py-2">
            Erro ao conectar com a Anja. Tente novamente.
          </p>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <InputBar onSend={handleSend} isLoading={isLoading} />
    </div>
  )
}
