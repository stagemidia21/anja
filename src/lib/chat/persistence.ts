import type { SupabaseClient } from '@supabase/supabase-js'
import type { UIMessage } from 'ai'

export type ChatSession = {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export async function loadSessions(
  supabase: SupabaseClient,
  userId: string,
): Promise<ChatSession[]> {
  const { data } = await supabase
    .from('chat_sessions')
    .select('id, title, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(30)
  return data ?? []
}

export async function createSession(
  supabase: SupabaseClient,
  userId: string,
  title = 'Nova conversa',
): Promise<ChatSession | null> {
  const { data } = await supabase
    .from('chat_sessions')
    .insert({ user_id: userId, title })
    .select('id, title, created_at, updated_at')
    .single()
  return data
}

export async function updateSessionTitle(
  supabase: SupabaseClient,
  sessionId: string,
  title: string,
): Promise<void> {
  await supabase
    .from('chat_sessions')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
}

export async function deleteSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<void> {
  await supabase.from('chat_sessions').delete().eq('id', sessionId)
}

export async function saveMessages(
  supabase: SupabaseClient,
  userId: string,
  messages: UIMessage[],
  sessionId?: string,
): Promise<void> {
  try {
    const rows = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => {
        const textContent = m.parts
          .filter((p) => p.type === 'text')
          .map((p) => (p as { type: 'text'; text: string }).text)
          .join('')

        const toolParts = m.parts.filter((p) => p.type === 'dynamic-tool')
        const toolInvocations = toolParts.length > 0 ? JSON.stringify(toolParts) : null

        return {
          id: m.id,
          user_id: userId,
          role: m.role,
          content: textContent,
          tool_invocations: toolInvocations,
          ...(sessionId ? { session_id: sessionId } : {}),
        }
      })

    if (rows.length === 0) return

    const { error } = await supabase
      .from('messages')
      .upsert(rows, { onConflict: 'id' })

    if (error) console.error('[persistence] Erro ao salvar mensagens:', error)

    // Atualiza updated_at da sessão
    if (sessionId) {
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId)
    }
  } catch (e) {
    console.error('[persistence] Exceção ao salvar mensagens:', e)
  }
}

export async function loadMessages(
  supabase: SupabaseClient,
  userId: string,
  sessionId?: string,
  limit = 50,
): Promise<UIMessage[]> {
  try {
    let query = supabase
      .from('messages')
      .select('id, role, content, tool_invocations, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    } else {
      query = query.is('session_id', null)
    }

    const { data, error } = await query

    if (error) {
      console.error('[persistence] Erro ao carregar mensagens:', error)
      return []
    }

    const rows = (data ?? []).reverse()

    return rows.map((row) => {
      const parts: UIMessage['parts'] = [{ type: 'text', text: row.content }]

      if (row.tool_invocations) {
        try {
          const toolParts = JSON.parse(row.tool_invocations)
          if (Array.isArray(toolParts)) parts.push(...toolParts)
        } catch { /* ignora */ }
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
