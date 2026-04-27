'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionResult = { error: string } | { success: true }

export async function signUp(formData: FormData): Promise<ActionResult> {
  const supabase = createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }
  return { success: true }
}

export async function signIn(formData: FormData): Promise<ActionResult> {
  const supabase = createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  redirect('/crm')
}

export async function signInWithGoogle() {
  const supabase = createClient()
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })
  if (error || !data.url) redirect('/login?error=oauth_failed')
  redirect(data.url)
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function resetPassword(formData: FormData): Promise<ActionResult> {
  const supabase = createClient()
  const email = formData.get('email') as string
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function updatePassword(formData: FormData): Promise<ActionResult> {
  const supabase = createClient()
  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }
  redirect('/crm')
}
