import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(`${origin}/login?error=invalid_invite`)
  }

  const admin = createAdminClient()
  const supabase = createClient()

  // Verify current user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // Store token in redirect so user can log in first, then accept
    return NextResponse.redirect(
      `${origin}/login?redirect=/auth/accept-invite?token=${token}`
    )
  }

  // Read invitation from DB — role sourced from DB, never from URL
  // Cross-validate invited_email === session user email (prevents token theft across accounts)
  const { data: invitation, error: invErr } = await admin
    .from('organization_invitations')
    .select('*')
    .eq('token', token)
    .eq('invited_email', user.email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (invErr || !invitation) {
    return NextResponse.redirect(`${origin}/login?error=invite_expired`)
  }

  // Add user to org with role from DB record
  await admin.from('organization_members').upsert({
    organization_id: invitation.organization_id,
    user_id: user.id,
    role: invitation.role, // role from DB, not URL
    invited_by: invitation.invited_by,
  })

  // Set as active org
  await admin
    .from('profiles')
    .update({ active_organization_id: invitation.organization_id })
    .eq('id', user.id)

  // Mark invitation accepted
  await admin
    .from('organization_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return NextResponse.redirect(`${origin}/crm`)
}
