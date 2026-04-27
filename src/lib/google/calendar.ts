import { google } from 'googleapis'

function getCalendarClient(token: string, isRefreshToken = false) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  if (isRefreshToken) {
    oauth2Client.setCredentials({ refresh_token: token })
  } else {
    oauth2Client.setCredentials({ access_token: token })
  }
  return google.calendar({ version: 'v3', auth: oauth2Client })
}

export function getCalendarClientFromRefreshToken(refreshToken: string) {
  return getCalendarClient(refreshToken, true)
}

export type CalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  description?: string
  location?: string
  htmlLink?: string
}

export async function listEvents(
  providerToken: string,
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  const cal = getCalendarClient(providerToken)
  const res = await cal.events.list({
    calendarId: 'primary',
    timeMin: new Date(startDate).toISOString(),
    timeMax: new Date(endDate + 'T23:59:59').toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
  })
  return (res.data.items ?? []).map((e) => ({
    id: e.id ?? '',
    title: e.summary ?? '(sem título)',
    start: e.start?.dateTime ?? e.start?.date ?? '',
    end: e.end?.dateTime ?? e.end?.date ?? '',
    description: e.description ?? undefined,
    location: e.location ?? undefined,
    htmlLink: e.htmlLink ?? undefined,
  }))
}

export async function createEvent(
  providerToken: string,
  event: {
    title: string
    start_datetime: string
    end_datetime: string
    description?: string
    location?: string
  }
): Promise<{ id: string; htmlLink: string } | null> {
  const cal = getCalendarClient(providerToken)
  const res = await cal.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: { dateTime: event.start_datetime, timeZone: 'America/Sao_Paulo' },
      end: { dateTime: event.end_datetime, timeZone: 'America/Sao_Paulo' },
    },
  })
  return { id: res.data.id ?? '', htmlLink: res.data.htmlLink ?? '' }
}

export async function createEventFromRefreshToken(
  refreshToken: string,
  event: {
    title: string
    start_datetime: string
    end_datetime: string
    description?: string
    location?: string
  }
): Promise<{ id: string; htmlLink: string } | null> {
  const cal = getCalendarClient(refreshToken, true)
  const res = await cal.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: { dateTime: event.start_datetime, timeZone: 'America/Sao_Paulo' },
      end: { dateTime: event.end_datetime, timeZone: 'America/Sao_Paulo' },
    },
  })
  return { id: res.data.id ?? '', htmlLink: res.data.htmlLink ?? '' }
}
