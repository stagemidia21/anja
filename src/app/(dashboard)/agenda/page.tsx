import Link from 'next/link'
import { Calendar, MessageSquare, ArrowRight } from 'lucide-react'

export default function AgendaPage() {
  const today = new Date()
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]

  const year = today.getFullYear()
  const month = today.getMonth()
  const todayDate = today.getDate()

  // Gerar dias do mês
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const calendarCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  // Completar até múltiplo de 7
  while (calendarCells.length % 7 !== 0) calendarCells.push(null)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-cream">Agenda</h1>
          <p className="text-muted text-sm mt-0.5">{months[month]} {year}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-gold" />
        </div>
      </div>

      {/* Calendário */}
      <div className="bg-char-2 border border-char-3 rounded-xl overflow-hidden">
        {/* Header dos dias */}
        <div className="grid grid-cols-7 border-b border-char-3">
          {weekDays.map((d) => (
            <div key={d} className="py-3 text-center text-xs text-muted font-normal">
              {d}
            </div>
          ))}
        </div>

        {/* Células */}
        <div className="grid grid-cols-7">
          {calendarCells.map((day, i) => {
            const isToday = day === todayDate
            const isWeekend = i % 7 === 0 || i % 7 === 6
            return (
              <div
                key={i}
                className={`min-h-[48px] p-2 border-b border-r border-char-3 last:border-r-0 ${
                  !day ? 'opacity-0' : ''
                } ${isWeekend && day ? 'bg-char-2/50' : ''}`}
              >
                {day && (
                  <div
                    className={`w-7 h-7 flex items-center justify-center rounded-full text-sm ${
                      isToday
                        ? 'bg-gold text-charcoal font-semibold'
                        : 'text-cream'
                    }`}
                  >
                    {day}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Google Calendar pendente */}
      <div className="bg-char-2 border border-char-3 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-gold" />
          </div>
          <div>
            <p className="text-sm font-semibold text-cream">Google Calendar</p>
            <p className="text-xs text-muted mt-0.5">Integração disponível em breve</p>
          </div>
        </div>
        <p className="text-sm text-muted">
          Em breve você poderá conectar o Google Calendar e a Anja vai consultar e criar eventos diretamente pelo chat.
        </p>
        <Link href="/chat">
          <div className="flex items-center gap-2 text-sm text-gold hover:text-gold-light transition-colors mt-1">
            <MessageSquare className="w-4 h-4" />
            <span>Enquanto isso, peça para a Anja gerenciar sua agenda no chat</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </Link>
      </div>
    </div>
  )
}
