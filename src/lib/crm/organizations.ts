'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/get-current-user'
import { z } from 'zod'

const CreateOrgSchema = z.object({
  org_name: z.string().min(2).max(80),
  org_slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/),
  timezone: z.string().default('America/Sao_Paulo'),
  currency: z.string().length(3).default('BRL'),
})

export async function createOrg(formData: FormData) {
  await requireUser()
  const supabase = createClient()

  const parsed = CreateOrgSchema.safeParse({
    org_name: formData.get('org_name'),
    org_slug: formData.get('org_slug'),
    timezone: formData.get('timezone') ?? 'America/Sao_Paulo',
    currency: formData.get('currency') ?? 'BRL',
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data, error } = await supabase.rpc('create_organization', parsed.data)
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/crm')
}

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'vendedor', 'viewer']),
  organization_id: z.string().uuid(),
})

export async function inviteMember(formData: FormData) {
  const user = await requireUser()
  const admin = createAdminClient()
  const supabase = createClient()

  const parsed = InviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
    organization_id: formData.get('organization_id'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', parsed.data.organization_id)
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'admin') return { error: 'Apenas administradores podem convidar membros' }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { error: authError } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/auth/accept-invite`,
    data: { organization_id: parsed.data.organization_id },
  })
  if (authError && !authError.message.includes('already registered')) {
    return { error: authError.message }
  }

  const { error: invErr } = await admin.from('organization_invitations').insert({
    organization_id: parsed.data.organization_id,
    invited_email: parsed.data.email,
    role: parsed.data.role,
    invited_by: user.id,
  })
  if (invErr) return { error: invErr.message }

  revalidatePath('/crm/settings/team')
  return { success: true }
}

export async function updateOrg(formData: FormData) {
  await requireUser()
  const supabase = createClient()

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const timezone = formData.get('timezone') as string
  const currency = formData.get('currency') as string

  const { error } = await supabase
    .from('organizations')
    .update({ name, timezone, currency })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/crm/settings/organization')
  return { success: true }
}

export async function listMembers(organizationId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('organization_members')
    .select('user_id, role, joined_at, profiles(full_name, avatar_url)')
    .eq('organization_id', organizationId)
  return data ?? []
}

export async function listInvitations(organizationId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('organization_invitations')
    .select('id, invited_email, role, expires_at, accepted_at, created_at')
    .eq('organization_id', organizationId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
  return data ?? []
}
