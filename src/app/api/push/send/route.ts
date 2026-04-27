import webpush from 'web-push'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const serviceSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export async function POST(req: Request) {
  // Protege com secret interno para chamadas do notifier
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { user_id, title, body, url } = await req.json()

  const { data: subs } = await serviceSupabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', user_id)

  if (!subs?.length) return Response.json({ sent: 0 })

  const payload = JSON.stringify({ title, body, url: url ?? '/dashboard' })

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  // Remove subscriptions expiradas (410 Gone)
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (r.status === 'rejected') {
      const err = r.reason as { statusCode?: number }
      if (err?.statusCode === 410) {
        await serviceSupabase.from('push_subscriptions').delete().eq('endpoint', subs[i].endpoint)
      }
    }
  }

  return Response.json({ sent, failed })
}
