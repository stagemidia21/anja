'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Registra service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Captura o evento de instalação
    const handler = (e: Event) => {
      e.preventDefault()
      const alreadyDismissed = localStorage.getItem('pwa-dismissed')
      if (!alreadyDismissed) {
        setInstallPrompt(e as BeforeInstallPromptEvent)
        setShowBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setShowBanner(false)
    setInstallPrompt(null)
  }

  function dismiss() {
    setShowBanner(false)
    setDismissed(true)
    localStorage.setItem('pwa-dismissed', '1')
  }

  if (!showBanner || dismissed) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 bg-char-2 border border-char-3 rounded-2xl shadow-2xl p-4 flex items-start gap-3 fade-up">
      <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Download className="w-4 h-4 text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-cream">Instalar Anja</p>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">Acesse mais rápido pela tela inicial do seu dispositivo.</p>
        <div className="flex gap-2 mt-3">
          <button onClick={install}
            className="flex-1 bg-gold text-charcoal text-xs font-semibold py-1.5 rounded-lg hover:bg-gold-light transition-colors">
            Instalar
          </button>
          <button onClick={dismiss}
            className="text-xs text-muted hover:text-cream px-2 transition-colors">
            Agora não
          </button>
        </div>
      </div>
      <button onClick={dismiss} className="text-muted hover:text-cream transition-colors p-0.5 flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
