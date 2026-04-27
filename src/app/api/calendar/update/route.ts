import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceCalendarClient, getUserCalendarId } from '@/lib/google/service-calendar'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { eventId, title, start_datetime, end_datetime, recurrence } = await req.json()
    if (!eventId) return NextResponse.json({ error: 'eventId obrigatório' }, { status: 400 })

    const [cal, calendarId] = await Promise.all([
      Promise.resolve(getServiceCalendarClient()),
      getUserCalendarId(),
    ])

    await cal.events.update({
      calendarId,
      eventId,
      requestBody: {
        summary: title,
        start: { dateTime: start_datetime, timeZone: 'America/Sao_Paulo' },
        end:   { dateTime: end_datetime,   timeZone: 'America/Sao_Paulo' },
        ...(recurrence?.length ? { recurrence } : {}),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[calendar/update]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
