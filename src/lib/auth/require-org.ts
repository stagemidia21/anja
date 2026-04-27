'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-current-user'

export async function requireOrg() {
  const user = await requireUser()
  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('active_organization_id')
    .eq('id', user.id)
    .single()
  const organizationId = profile?.active_organization_id
  if (!organizationId) redirect('/crm')
  return { user, organizationId: organizationId as string }
}
