import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'stagemidia21@gmail.com'

export function getServiceCalendarClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
  return google.calendar({ version: 'v3', auth })
}

/** Resolve o calendar ID do usuário autenticado via cookie de sessão */
export async function getUserCalendarId(): Promise<string> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return DEFAULT_CALENDAR_ID
    const { data } = await supabase
      .from('profiles')
      .select('google_calendar_id')
      .eq('id', user.id)
      .single()
    return (data as { google_calendar_id?: string | null } | null)?.google_calendar_id || DEFAULT_CALENDAR_ID
  } catch {
    return DEFAULT_CALENDAR_ID
  }
}
