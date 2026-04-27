'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[anja] global error:', error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: '#100A02', color: '#F4EEE2', fontFamily: 'sans-serif' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '24px',
          gap: '16px',
        }}>
          <p style={{ fontSize: 96, fontWeight: 300, color: 'rgba(215,60,60,0.15)', margin: 0 }}>500</p>
          <h1 style={{ fontSize: 28, fontWeight: 500, margin: 0 }}>Falha crítica</h1>
          <p style={{ color: '#8A7A60', fontSize: 14, maxWidth: 320, margin: 0 }}>
            O aplicativo encontrou um erro grave. Tenta recarregar a página.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#C8902A',
              color: '#100A02',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Recarregar
          </button>
          {error.digest && (
            <p style={{ fontSize: 11, color: 'rgba(138,122,96,0.5)', fontFamily: 'monospace' }}>
              código: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
