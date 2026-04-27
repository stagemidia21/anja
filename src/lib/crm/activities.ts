'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrg } from '@/lib/auth/require-org'
import {
  callSchema,
  meetingSchema,
  type CallInput,
  type MeetingInput,
} from '@/lib/validations/activity'

export type TimelineActivity = {
  id: string
  type: 'call' | 'meeting' | 'email' | 'whatsapp' | 'note' | 'task' | 'stage_change' | 'system'
  direction: 'inbound' | 'outbound' | 'internal' | null
  subject_type: 'contact' | 'company' | 'deal'
  subject_id: string
  contact_id: string | null
  deal_id: string | null
  actor_id: string | null
  body: string | null
  metadata: Record<string, unknown>
  duration_minutes: number | null
  outcome: string | null
  occurred_at: string
  created_at: string
  participants?: { contact_id: string; full_name: string }[]
}

export async function listActivitiesForContact(
  contactId: string,
  opts?: { types?: string[]; limit?: number }
) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  let q = supabase
    .from('activities')
    .select(
      'id, type, direction, subject_type, subject_id, contact_id, deal_id, actor_id, body, metadata, duration_minutes, outcome, occurred_at, created_at'
    )
    .eq('organization_id', organizationId)
    .eq('contact_id', contactId)
    .order('occurred_at', { ascending: false })
    .limit(opts?.limit ?? 200)

  if (opts?.types?.length) {
    q = q.in('type', opts.types)
  }

  const { data, error } = await q
  if (error) return { data: [] as TimelineActivity[], error: error.message }
  return { data: (data ?? []) as TimelineActivity[] }
}

export async function listActivitiesForDeal(
  dealId: string,
  opts?: { types?: string[]; limit?: number }
) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  let q = supabase
    .from('activities')
    .select(
      'id, type, direction, subject_type, subject_id, contact_id, deal_id, actor_id, body, metadata, duration_minutes, outcome, occurred_at, created_at'
    )
    .eq('organization_id', organizationId)
    .eq('deal_id', dealId)
    .order('occurred_at', { ascending: false })
    .limit(opts?.limit ?? 200)

  if (opts?.types?.length) {
    q = q.in('type', opts.types)
  }

  const { data, error } = await q
  if (error) return { data: [] as TimelineActivity[], error: error.message }
  return { data: (data ?? []) as TimelineActivity[] }
}

export async function logCall(input: CallInput) {
  const parsed = callSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { user, organizationId } = await requireOrg()
  const supabase = createClient()

  const { data, error } = await supabase
    .from('activities')
    .insert({
      organization_id: organizationId,
      type: 'call',
      direction: 'outbound',
      subject_type: parsed.data.subject_type,
      subject_id: parsed.data.subject_id,
      contact_id:
        parsed.data.contact_id ??
        (parsed.data.subject_type === 'contact' ? parsed.data.subject_id : null),
      deal_id:
        parsed.data.deal_id ??
        (parsed.data.subject_type === 'deal' ? parsed.data.subject_id : null),
      actor_id: user.id,
      body: parsed.data.body ?? null,
      duration_minutes: parsed.data.duration_minutes ?? null,
      outcome: parsed.data.outcome ?? null,
      occurred_at: parsed.data.occurred_at ?? new Date().toISOString(),
      metadata: {},
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  if (parsed.data.subject_type === 'contact') {
    revalidatePath(`/crm/contacts/${parsed.data.subject_id}`)
  } else {
    revalidatePath(`/crm/deals/${parsed.data.subject_id}`)
  }

  return { data }
}

export async function logMeeting(input: MeetingInput) {
  const parsed = meetingSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { user, organizationId } = await requireOrg()
  const supabase = createClient()

  const { data, error } = await supabase
    .from('activities')
    .insert({
      organization_id: organizationId,
      type: 'meeting',
      direction: 'internal',
      subject_type: parsed.data.subject_type,
      subject_id: parsed.data.subject_id,
      contact_id:
        parsed.data.contact_id ??
        (parsed.data.subject_type === 'contact' ? parsed.data.subject_id : null),
      deal_id:
        parsed.data.deal_id ??
        (parsed.data.subject_type === 'deal' ? parsed.data.subject_id : null),
      actor_id: user.id,
      body: parsed.data.body ?? null,
      duration_minutes: parsed.data.duration_minutes ?? null,
      occurred_at: parsed.data.occurred_at,
      metadata: {},
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  if (parsed.data.participants.length > 0) {
    const rows = parsed.data.participants.map((cid) => ({
      activity_id: data.id,
      contact_id: cid,
      organization_id: organizationId,
    }))
    const { error: pErr } = await supabase.from('activity_participants').insert(rows)
    if (pErr) return { error: pErr.message }
  }

  if (parsed.data.subject_type === 'contact') {
    revalidatePath(`/crm/contacts/${parsed.data.subject_id}`)
  } else {
    revalidatePath(`/crm/deals/${parsed.data.subject_id}`)
  }

  return { data }
}
