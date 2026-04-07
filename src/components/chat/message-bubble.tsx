'use client'

import type { UIMessage, TextUIPart, DynamicToolUIPart } from 'ai'
import { ToolLoading } from './tool-loading'
import { ToolResult } from './tool-result'

interface MessageBubbleProps {
  message: UIMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === 'system') return null

  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] md:max-w-[70%] ${
          isUser
            ? 'bg-gold/10 border border-gold/20 text-cream rounded-2xl rounded-br-md px-4 py-2.5'
            : 'bg-char-2 border border-char-3 text-cream rounded-2xl rounded-bl-md px-4 py-2.5'
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === 'text') {
            const textPart = part as TextUIPart
            return (
              <p key={i} className="text-sm whitespace-pre-wrap">
                {textPart.text}
              </p>
            )
          }

          if (part.type === 'dynamic-tool') {
            const toolPart = part as DynamicToolUIPart
            const isLoading =
              toolPart.state === 'input-streaming' || toolPart.state === 'input-available'
            const hasOutput = toolPart.state === 'output-available'

            if (isLoading) {
              return <ToolLoading key={i} toolName={toolPart.toolName} />
            }

            if (hasOutput) {
              return (
                <ToolResult
                  key={i}
                  toolName={toolPart.toolName}
                  result={toolPart.output}
                />
              )
            }
          }

          return null
        })}
      </div>
    </div>
  )
}
