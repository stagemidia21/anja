'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrg } from '@/lib/auth/require-org'
import { noteSchema, type NoteInput } from '@/lib/validations/activity'

export async function createNote(input: NoteInput) {
  const parsed = noteSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { user, organizationId } = await requireOrg()
  const supabase = createClient()

  const { data, error } = await supabase
    .from('activities')
    .insert({
      organization_id: organizationId,
      type: 'note',
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
      body: parsed.data.body,
      metadata: {},
      occurred_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  if (parsed.data.subject_type === 'contact') {
    revalidatePath(`/crm/contacts/${parsed.data.subject_id}`)
  } else if (parsed.data.subject_type === 'deal') {
    revalidatePath(`/crm/deals/${parsed.data.subject_id}`)
  } else if (parsed.data.subject_type === 'company') {
    revalidatePath(`/crm/companies/${parsed.data.subject_id}`)
  }

  return { data }
}
