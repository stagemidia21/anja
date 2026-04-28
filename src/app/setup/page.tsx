import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { OnboardingForm } from './OnboardingForm'

export default async function SetupPage() {
  const user = await requireUser()
  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('active_organization_id')
    .eq('id', user.id)
    .single()

  if (profile?.active_organization_id) redirect('/crm')

  return (
    <div>
      <h1 className="text-2xl font-semibold text-cream-50 mb-2">Criar sua organização</h1>
      <p className="text-cream-400 mb-8">Configure em menos de 2 minutos.</p>
      <OnboardingForm />
    </div>
  )
}
