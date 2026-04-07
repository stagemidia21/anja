import { anthropic } from '@ai-sdk/anthropic'
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { ANJA_SYSTEM_PROMPT, ANJA_MODEL, ANJA_MAX_TOKENS, ANJA_MAX_STEPS } from '@/lib/anthropic'
import { anjaTools } from '@/lib/tools'
import { checkRateLimit } from '@/lib/chat/rate-limit'
import { saveMessages, loadMessages } from '@/lib/chat/persistence'

export const maxDuration = 60

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const messages = await loadMessages(supabase, user.id)
  return Response.json(messages)
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Rate limiting antes de chamar a Claude API
  const rateLimit = await checkRateLimit(supabase, user.id)
  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: `Limite de ${rateLimit.limit} mensagens/mês atingido. Seu plano: ${rateLimit.plan}.`,
        code: 'RATE_LIMITED',
        current: rateLimit.current,
        limit: rateLimit.limit,
      },
      { status: 429 },
    )
  }

  const { messages }: { messages: UIMessage[] } = await req.json()

  // Janela de contexto: apenas as últimas 20 mensagens enviadas ao modelo
  const recentMessages = messages.slice(-20)
  const modelMessages = await convertToModelMessages(recentMessages, { tools: anjaTools })

  const result = streamText({
    model: anthropic(ANJA_MODEL),
    system: ANJA_SYSTEM_PROMPT,
    messages: modelMessages,
    tools: anjaTools,
    stopWhen: stepCountIs(ANJA_MAX_STEPS),
    maxOutputTokens: ANJA_MAX_TOKENS,
    onFinish: async ({ text, toolCalls }) => {
      try {
        const assistantMessage: UIMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          parts: [
            { type: 'text', text },
            ...(toolCalls?.map((tc) => ({
              type: 'dynamic-tool' as const,
              toolName: tc.toolName,
              toolCallId: tc.toolCallId,
              state: 'input-available' as const,
              input: tc.input,
            })) ?? []),
          ],
        }
        const userMessage = messages[messages.length - 1]
        if (userMessage) {
          await saveMessages(supabase, user.id, [userMessage, assistantMessage])
        }
      } catch (e) {
        console.error('[route] Erro ao salvar mensagens no onFinish:', e)
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
