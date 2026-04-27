'use server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-current-user'

export type OrgMembership = {
  id: string
  name: string
  slug: string
  role: string
}

export async function switchOrg(newOrgId: string): Promise<{ error?: string }> {
  const user = await requireUser()
  const supabase = createClient()

  // Verify user is actually a member of the target org (never trust client input)
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('organization_id', newOrgId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return { error: 'Você não é membro dessa organização.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ active_organization_id: newOrgId })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return {}
}

export async function getUserOrgs(): Promise<OrgMembership[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('organization_members')
    .select('role, organizations(id, name, slug)')
    .eq('user_id', user.id)

  return (data ?? []).map((m: any) => ({
    id: (m.organizations as any).id as string,
    name: (m.organizations as any).name as string,
    slug: (m.organizations as any).slug as string,
    role: m.role as string,
  }))
}
