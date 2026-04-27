import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceCalendarClient, getUserCalendarId } from '@/lib/google/service-calendar'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { eventId } = await req.json()
    if (!eventId) return NextResponse.json({ error: 'eventId obrigatório' }, { status: 400 })

    const [cal, calendarId] = await Promise.all([
      Promise.resolve(getServiceCalendarClient()),
      getUserCalendarId(),
    ])

    await cal.events.delete({ calendarId, eventId })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('410') || msg.includes('Resource has been deleted')) {
      return NextResponse.json({ ok: true })
    }
    console.error('[calendar/delete]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
