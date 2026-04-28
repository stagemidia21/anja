import { requireUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { listMembers, listInvitations } from '@/lib/crm/organizations'
import { InviteForm } from './InviteForm'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  vendedor: 'Vendedor',
  viewer: 'Visualizador',
}

export default async function TeamPage() {
  const user = await requireUser()
  const supabase = createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_organization_id')
    .eq('id', user.id)
    .single()

  const organizationId = profile?.active_organization_id
  if (!organizationId) {
    return (
      <div className="p-8 text-cream-400">
        Nenhuma organização encontrada. <a href="/setup" className="text-gold-400 underline">Criar organização</a>
      </div>
    )
  }

  const [members, invitations] = await Promise.all([
    listMembers(organizationId),
    listInvitations(organizationId),
  ])

  const currentMember = members.find((m: any) => m.user_id === user.id)
  const isAdmin = currentMember?.role === 'admin'

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-cream-50">Equipe</h1>
        <p className="text-cream-400 text-sm mt-1">Gerencie membros e convites da organização.</p>
      </div>

      {/* Members */}
      <section>
        <h2 className="text-base font-semibold text-cream-200 mb-4">Membros ativos</h2>
        {members.length === 0 ? (
          <p className="text-cream-500 text-sm">Nenhum membro encontrado.</p>
        ) : (
          <div className="divide-y divide-charcoal-700 rounded-xl border border-charcoal-700 overflow-hidden">
            {members.map((member: any) => {
              const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
              return (
                <div key={member.user_id} className="flex items-center justify-between px-5 py-3 bg-charcoal-900">
                  <div className="flex items-center gap-3">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile?.full_name ?? 'Avatar'}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-charcoal-700 flex items-center justify-center text-cream-400 text-xs font-semibold">
                        {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-cream-100">
                        {profile?.full_name ?? 'Usuário'}
                        {member.user_id === user.id && (
                          <span className="ml-2 text-xs text-charcoal-400">(você)</span>
                        )}
                      </p>
                      <p className="text-xs text-charcoal-400">
                        Entrou em {member.joined_at ? new Date(member.joined_at).toLocaleDateString('pt-BR') : '—'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded bg-charcoal-700 text-cream-300">
                    {ROLE_LABELS[member.role] ?? member.role}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-cream-200 mb-4">Convites pendentes</h2>
          <div className="divide-y divide-charcoal-700 rounded-xl border border-charcoal-700 overflow-hidden">
            {invitations.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3 bg-charcoal-900">
                <div>
                  <p className="text-sm text-cream-100">{inv.invited_email}</p>
                  <p className="text-xs text-charcoal-400">
                    Expira em {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString('pt-BR') : '—'}
                  </p>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded bg-charcoal-700 text-cream-300">
                  {ROLE_LABELS[inv.role] ?? inv.role}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Invite form — admin only */}
      {isAdmin && (
        <section>
          <h2 className="text-base font-semibold text-cream-200 mb-4">Convidar membro</h2>
          <InviteForm organizationId={organizationId} />
        </section>
      )}
    </div>
  )
}
