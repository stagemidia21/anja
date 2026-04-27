'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export function AgendaRefreshButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleRefresh() {
    setLoading(true)
    router.refresh()
    // Aguarda o re-render do servidor antes de remover o spinner
    setTimeout(() => setLoading(false), 1200)
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      title="Sincronizar com Google Calendar"
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-150 btn-press ${
        loading
          ? 'text-gold border-gold/30 bg-gold/8'
          : 'text-muted border-char-3 hover:text-cream hover:border-char-3/80'
      }`}
    >
      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-gold' : ''}`} />
      <span className="hidden sm:inline">{loading ? 'Sincronizando...' : 'Sincronizar'}</span>
    </button>
  )
}
