'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

export function AgendaWeekNav({ weekOffset }: { weekOffset: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function go(delta: number) {
    const next = weekOffset + delta
    const params = new URLSearchParams(searchParams.toString())
    if (next === 0) {
      params.delete('week')
    } else {
      params.set('week', String(next))
    }
    router.push(`/agenda?${params.toString()}`)
  }

  function goToday() {
    router.push('/agenda')
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => go(-1)}
        className="p-1.5 rounded-lg text-muted hover:text-cream hover:bg-char-3/60 transition-all"
        aria-label="Semana anterior"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {weekOffset !== 0 && (
        <button
          onClick={goToday}
          className="flex items-center gap-1 text-xs text-gold hover:text-gold-light px-2 py-1 rounded-lg hover:bg-gold/8 transition-all"
        >
          <CalendarDays className="w-3.5 h-3.5" />
          Hoje
        </button>
      )}

      <button
        onClick={() => go(1)}
        className="p-1.5 rounded-lg text-muted hover:text-cream hover:bg-char-3/60 transition-all"
        aria-label="Próxima semana"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
