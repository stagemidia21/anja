import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceCalendarClient, getUserCalendarId } from '@/lib/google/service-calendar'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const body = await req.json()
    const { title, description, start_datetime, end_datetime, colorId, recurrence } = body

    if (!title || !start_datetime || !end_datetime) {
      return NextResponse.json({ error: 'title, start_datetime e end_datetime são obrigatórios' }, { status: 400 })
    }

    const [cal, calendarId] = await Promise.all([
      Promise.resolve(getServiceCalendarClient()),
      getUserCalendarId(),
    ])

    const res = await cal.events.insert({
      calendarId,
      requestBody: {
        summary: title,
        description: description ?? '',
        start: { dateTime: start_datetime, timeZone: 'America/Sao_Paulo' },
        end: { dateTime: end_datetime, timeZone: 'America/Sao_Paulo' },
        ...(colorId ? { colorId: String(colorId) } : {}),
        ...(recurrence?.length ? { recurrence } : {}),
      },
    })

    return NextResponse.json({ id: res.data.id, htmlLink: res.data.htmlLink })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[calendar/create]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
