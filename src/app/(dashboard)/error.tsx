'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[anja] dashboard error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center mb-5">
        <AlertTriangle className="w-6 h-6 text-danger" />
      </div>

      <h2 className="font-display text-2xl font-medium text-cream mb-2">
        Erro ao carregar a página
      </h2>

      <p className="text-muted text-sm max-w-sm mb-8">
        Algo inesperado aconteceu. Tenta recarregar — se o problema persistir, volte para o dashboard.
      </p>

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-gold hover:bg-gold-light text-charcoal font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Tentar novamente
        </button>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 border border-char3 hover:border-gold/40 text-muted hover:text-cream text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          <Home className="w-4 h-4" />
          Dashboard
        </Link>
      </div>

      {error.digest && (
        <p className="mt-6 font-mono text-xs text-muted/40">ref: {error.digest}</p>
      )}
    </div>
  )
}
