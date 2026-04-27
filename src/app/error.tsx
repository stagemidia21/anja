'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[anja] error boundary:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-charcoal grain flex flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-8xl font-light text-danger/20 select-none mb-2">500</p>

      <h1 className="font-display text-3xl font-medium text-cream mb-3">
        Algo deu errado
      </h1>

      <p className="text-muted text-sm max-w-xs mb-8">
        Um erro inesperado aconteceu. Tenta recarregar — se persistir, entre em contato.
      </p>

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-gold hover:bg-gold-light text-charcoal font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
        >
          Tentar novamente
        </button>

        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 border border-char3 hover:border-gold/40 text-muted hover:text-cream text-sm px-5 py-2.5 rounded-lg transition-colors"
        >
          Ir para o Dashboard
        </a>
      </div>

      {error.digest && (
        <p className="mt-8 font-mono text-xs text-muted/40">
          código: {error.digest}
        </p>
      )}

      <p className="mt-12 text-muted/40 text-xs tracking-widest uppercase">Anja</p>
    </div>
  )
}
