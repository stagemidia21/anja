import { requireUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

export default async function ProfilePage() {
  const user = await requireUser()
  const supabase = createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-semibold text-cream mb-6">Meu Perfil</h1>
      <div className="space-y-4">
        <div>
          <label className="text-muted text-sm block mb-1">Email</label>
          <p className="text-cream">{user.email}</p>
        </div>
        <div>
          <label className="text-muted text-sm block mb-1">Nome</label>
          <p className="text-cream">{profile?.full_name ?? '—'}</p>
        </div>
      </div>
    </div>
  )
}
