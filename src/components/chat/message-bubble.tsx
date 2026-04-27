'use client'

import type { UIMessage, TextUIPart } from 'ai'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MessageBubbleProps {
  message: UIMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === 'system') return null
  const isUser = message.role === 'user'

  const text = message.parts
    .filter((p): p is TextUIPart => p.type === 'text')
    .map((p) => p.text)
    .join('')

  if (!text) return null

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-1 fade-up`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gold/15 border border-gold/20 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
          <span className="font-display text-gold text-sm">A</span>
        </div>
      )}
      <div className={`max-w-[82%] md:max-w-[68%] px-4 py-2.5 text-sm leading-relaxed ${
        isUser
          ? 'bg-gold/10 border border-gold/20 text-cream rounded-2xl rounded-br-sm'
          : 'bg-char-2 border border-char-3 text-cream rounded-2xl rounded-bl-sm'
      }`}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{text}</p>
        ) : (
          <div className="prose-anja space-y-1.5">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-cream">{children}</strong>,
                em: ({ children }) => <em className="text-cream/80">{children}</em>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
                ul: ({ children }) => <ul className="space-y-0.5 pl-1">{children}</ul>,
                ol: ({ children }) => <ol className="space-y-0.5 pl-4 list-decimal">{children}</ol>,
                li: ({ children }) => (
                  <li className="flex gap-2 text-cream/90">
                    <span className="text-gold mt-1.5 flex-shrink-0 text-[8px]">◆</span>
                    <span>{children}</span>
                  </li>
                ),
                code: ({ children }) => (
                  <code>{children}</code>
                ),
                h1: ({ children }) => <h2 className="font-display text-gold text-lg font-normal mt-1">{children}</h2>,
                h2: ({ children }) => <h3 className="font-semibold text-cream mt-1">{children}</h3>,
                h3: ({ children }) => <h4 className="font-medium text-cream/90">{children}</h4>,
                hr: () => <hr className="border-char-3 my-2" />,
              }}
            >
              {text}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
