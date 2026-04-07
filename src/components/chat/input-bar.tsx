'use client'

import { SendHorizonal } from 'lucide-react'

interface InputBarProps {
  onSend: (text: string) => void
  isLoading: boolean
}

export function InputBar({ onSend, isLoading }: InputBarProps) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const textarea = form.elements.namedItem('message') as HTMLTextAreaElement
    const text = textarea.value.trim()
    if (!text || isLoading) return
    onSend(text)
    textarea.value = ''
    textarea.style.height = 'auto'
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const form = e.currentTarget.form
      if (form) form.requestSubmit()
    }
  }

  function handleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  return (
    <div className="sticky bottom-0 bg-charcoal border-t border-char-3 p-3 md:p-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          name="message"
          rows={1}
          placeholder="Mensagem para Anja..."
          disabled={isLoading}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          className="bg-char-2 border border-char-3 text-cream rounded-xl px-4 py-3 flex-1 resize-none focus:outline-none focus:border-gold/40 placeholder:text-muted text-sm min-h-[44px] max-h-[120px] overflow-y-auto disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-gold text-charcoal rounded-xl p-3 hover:bg-gold-light transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          aria-label="Enviar mensagem"
        >
          <SendHorizonal className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
