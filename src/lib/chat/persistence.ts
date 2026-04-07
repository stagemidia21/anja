import type { SupabaseClient } from '@supabase/supabase-js'
import type { UIMessage } from 'ai'

/**
 * Salva mensagens no Supabase após cada interação.
 * Best-effort: erros são logados mas não quebram o chat.
 */
export async function saveMessages(
  supabase: SupabaseClient,
  userId: string,
  messages: UIMessage[],
): Promise<void> {
  try {
    const rows = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => {
        // Extrai texto das parts
        const textContent = m.parts
          .filter((p) => p.type === 'text')
          .map((p) => (p as { type: 'text'; text: string }).text)
          .join('')

        // Extrai tool invocations das dynamic-tool parts
        const toolParts = m.parts.filter((p) => p.type === 'dynamic-tool')
        const toolInvocations = toolParts.length > 0 ? JSON.stringify(toolParts) : null

        return {
          id: m.id,
          user_id: userId,
          role: m.role,
          content: textContent,
          tool_invocations: toolInvocations,
        }
      })

    if (rows.length === 0) return

    const { error } = await supabase
      .from('messages')
      .upsert(rows, { onConflict: 'id' })

    if (error) {
      console.error('[persistence] Erro ao salvar mensagens:', error)
    }
  } catch (e) {
    console.error('[persistence] Exceção ao salvar mensagens:', e)
  }
}

/**
 * Carrega histórico de mensagens do Supabase.
 * Retorna no formato UIMessage compatível com @ai-sdk/react.
 */
export async function loadMessages(
  supabase: SupabaseClient,
  userId: string,
  limit = 50,
): Promise<UIMessage[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id, role, content, tool_invocations, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[persistence] Erro ao carregar mensagens:', error)
      return []
    }

    if (!data) return []

    // Reverter para ordem cronológica
    const rows = data.reverse()

    return rows.map((row) => {
      const parts: UIMessage['parts'] = [{ type: 'text', text: row.content }]

      // Reconstrói tool parts se existirem
      if (row.tool_invocations) {
        try {
          const toolParts = JSON.parse(row.tool_invocations)
          if (Array.isArray(toolParts)) {
            parts.push(...toolParts)
          }
        } catch {
          // ignora JSON inválido
        }
      }

      return {
        id: row.id,
        role: row.role as 'user' | 'assistant',
        parts,
      }
    })
  } catch (e) {
    console.error('[persistence] Exceção ao carregar mensagens:', e)
    return []
  }
}
