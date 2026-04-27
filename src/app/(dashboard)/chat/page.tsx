import { createClient } from '@/lib/supabase/server'
import { loadSessions, loadMessages, createSession } from '@/lib/chat/persistence'
import { ChatLayout } from '@/components/chat/chat-layout'

export default async function ChatPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  let sessions = await loadSessions(supabase, user.id)

  // Cria sessão inicial se não houver nenhuma
  if (sessions.length === 0) {
    const s = await createSession(supabase, user.id, 'Nova conversa')
    if (s) sessions = [s]
  }

  const currentSession = sessions[0]
  const initialMessages = currentSession
    ? await loadMessages(supabase, user.id, currentSession.id)
    : []

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -m-4 md:-m-6 -mb-20 md:-mb-6">
      <ChatLayout
        userId={user.id}
        initialSessions={sessions}
        initialSessionId={currentSession?.id ?? null}
        initialMessages={initialMessages}
      />
    </div>
  )
}
