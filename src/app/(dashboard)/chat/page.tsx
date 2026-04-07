import { createClient } from '@/lib/supabase/server'
import { loadMessages } from '@/lib/chat/persistence'
import { ChatWindow } from '@/components/chat/chat-window'

export default async function ChatPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const initialMessages = user ? await loadMessages(supabase, user.id) : []

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] -m-4 md:-m-6 -mb-20 md:-mb-6">
      <ChatWindow initialMessages={initialMessages} />
    </div>
  )
}
