'use client'

import { useState, useCallback, useRef } from 'react'
import type { UIMessage } from 'ai'
import { createBrowserClient } from '@/lib/supabase/client'
import { type ChatSession, createSession, loadMessages, deleteSession, updateSessionTitle } from '@/lib/chat/persistence'
import { ChatWindow } from './chat-window'
import { Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight, Pencil, Check, X } from 'lucide-react'

interface ChatLayoutProps {
  userId: string
  initialSessions: ChatSession[]
  initialSessionId: string | null
  initialMessages: UIMessage[]
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function SessionItem({ session, active, onSelect, onDelete, onRename }: {
  session: ChatSession
  active: boolean
  onSelect: () => void
  onDelete: (e: React.MouseEvent) => void
  onRename: (newTitle: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(session.title)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setInput(session.title)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function confirmRename() {
    const t = input.trim()
    if (t && t !== session.title) onRename(t)
    setEditing(false)
  }

  function cancelRename() {
    setInput(session.title)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-char-3">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') cancelRename() }}
          className="flex-1 min-w-0 text-xs text-cream bg-transparent outline-none"
          autoFocus
        />
        <button onClick={confirmRename} className="text-gold hover:text-gold-light p-0.5 flex-shrink-0">
          <Check className="w-3 h-3" />
        </button>
        <button onClick={cancelRename} className="text-muted hover:text-cream p-0.5 flex-shrink-0">
          <X className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <button onClick={onSelect}
      className={`w-full flex items-start gap-2 px-2 py-2 rounded-lg text-left transition-colors group ${
        active ? 'bg-char-3 text-cream' : 'text-muted hover:bg-char-3/50 hover:text-cream'
      }`}>
      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate leading-snug">{session.title}</p>
        <p className="text-[10px] text-muted/60 mt-0.5">{timeAgo(session.updated_at)}</p>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={startEdit} className="text-muted hover:text-gold p-0.5">
          <Pencil className="w-3 h-3" />
        </button>
        <button onClick={onDelete} className="text-muted hover:text-danger p-0.5">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </button>
  )
}

export function ChatLayout({ userId, initialSessions, initialSessionId, initialMessages }: ChatLayoutProps) {
  const supabase = createBrowserClient()
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions)
  const [currentId, setCurrentId] = useState<string | null>(initialSessionId)
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages)
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleSelectSession(sessionId: string) {
    if (sessionId === currentId) { setSidebarOpen(false); return }
    setLoading(true)
    const msgs = await loadMessages(supabase, userId, sessionId)
    setMessages(msgs)
    setCurrentId(sessionId)
    setLoading(false)
    setSidebarOpen(false)
  }

  async function handleNewSession() {
    const s = await createSession(supabase, userId)
    if (!s) return
    setSessions(prev => [s, ...prev])
    setCurrentId(s.id)
    setMessages([])
    setSidebarOpen(false)
  }

  async function handleDeleteSession(e: React.MouseEvent, sessionId: string) {
    e.stopPropagation()
    await deleteSession(supabase, sessionId)
    const remaining = sessions.filter(s => s.id !== sessionId)
    setSessions(remaining)
    if (currentId === sessionId) {
      if (remaining.length > 0) {
        await handleSelectSession(remaining[0].id)
      } else {
        await handleNewSession()
      }
    }
  }

  async function handleRenameSession(sessionId: string, title: string) {
    await updateSessionTitle(supabase, sessionId, title)
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title } : s))
  }

  const handleSessionTitleUpdate = useCallback(async (sessionId: string, title: string) => {
    await updateSessionTitle(supabase, sessionId, title)
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title } : s))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSessionUpdate = useCallback((sessionId: string) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, updated_at: new Date().toISOString() } : s
    ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()))
  }, [])

  const currentSession = sessions.find(s => s.id === currentId)

  return (
    <div className="flex w-full h-full overflow-hidden">
      {/* Sidebar de sessões — desktop */}
      <aside className={`hidden md:flex flex-col bg-char-2 border-r border-char-3 transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-10'} flex-shrink-0`}>
        <div className="flex items-center justify-between px-2 py-3 border-b border-char-3">
          {sidebarOpen && <span className="text-xs font-semibold text-muted uppercase tracking-wide">Conversas</span>}
          <button onClick={() => setSidebarOpen(v => !v)}
            className="text-muted hover:text-cream transition-colors p-1 ml-auto">
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {sidebarOpen && (
          <>
            <button onClick={handleNewSession}
              className="flex items-center gap-2 mx-2 mt-2 px-2 py-2 rounded-lg bg-gold/10 border border-gold/20 hover:bg-gold/15 transition-colors text-xs text-gold font-medium">
              <Plus className="w-3.5 h-3.5" />
              Nova conversa
            </button>
            <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
              {sessions.map(s => (
                <SessionItem
                  key={s.id}
                  session={s}
                  active={s.id === currentId}
                  onSelect={() => handleSelectSession(s.id)}
                  onDelete={e => handleDeleteSession(e, s.id)}
                  onRename={title => handleRenameSession(s.id, title)}
                />
              ))}
            </div>
          </>
        )}
      </aside>

      {/* Chat principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Barra de sessão mobile + header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-char-3 bg-char-2 md:hidden">
          <button onClick={() => setSidebarOpen(v => !v)}
            className="text-muted hover:text-gold transition-colors p-1">
            <MessageSquare className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted truncate flex-1">{currentSession?.title ?? 'Conversa'}</span>
          <button onClick={handleNewSession}
            className="text-muted hover:text-gold transition-colors p-1">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer mobile */}
        {sidebarOpen && (
          <div className="absolute inset-0 z-40 md:hidden" onClick={() => setSidebarOpen(false)}>
            <div className="absolute left-0 top-0 bottom-0 w-64 bg-char-2 border-r border-char-3 flex flex-col"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-3 py-3 border-b border-char-3">
                <span className="text-xs font-semibold text-muted uppercase tracking-wide">Conversas</span>
                <button onClick={() => setSidebarOpen(false)} className="text-muted hover:text-cream p-1">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
              <button onClick={handleNewSession}
                className="flex items-center gap-2 mx-2 mt-2 px-3 py-2 rounded-lg bg-gold/10 border border-gold/20 text-xs text-gold font-medium">
                <Plus className="w-3.5 h-3.5" />
                Nova conversa
              </button>
              <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
                {sessions.map(s => (
                  <SessionItem
                    key={s.id}
                    session={s}
                    active={s.id === currentId}
                    onSelect={() => handleSelectSession(s.id)}
                    onDelete={e => handleDeleteSession(e, s.id)}
                    onRename={title => handleRenameSession(s.id, title)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gold/40 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-gold/40 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-gold/40 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        ) : (
          <ChatWindow
            key={currentId}
            initialMessages={messages}
            sessionId={currentId}
            userId={userId}
            onTitleUpdate={handleSessionTitleUpdate}
            onSessionUpdate={handleSessionUpdate}
          />
        )}
      </div>
    </div>
  )
}
