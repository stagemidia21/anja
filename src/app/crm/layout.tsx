import { requireUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgs } from '@/lib/crm/org-switcher'
import { OrgSwitcher } from '@/components/layout/OrgSwitcher'
import { CommandPaletteProvider } from '@/components/layout/CommandPaletteProvider'

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const supabase = createClient()

  const [orgs, profileResult] = await Promise.all([
    getUserOrgs(),
    supabase.from('profiles').select('active_organization_id').eq('id', user.id).single(),
  ])

  return (
    <CommandPaletteProvider>
    <div className="flex h-screen bg-charcoal">
      <aside className="w-64 border-r border-char-3 bg-char-2 flex flex-col">
        <a href="/dashboard" className="px-4 py-3 text-xs text-cream/50 hover:text-gold border-b border-char-3 transition-colors">
          ← Voltar para Anja
        </a>
        <div className="p-3 border-b border-char-3">
          <OrgSwitcher
            orgs={orgs}
            currentOrgId={profileResult.data?.active_organization_id ?? null}
          />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <a href="/crm" className="block px-3 py-2 text-cream rounded-lg hover:bg-char-3 text-sm transition-colors">
            Dashboard
          </a>
          <a href="/crm/contacts" className="block px-3 py-2 text-cream rounded-lg hover:bg-char-3 text-sm transition-colors">
            Contatos
          </a>
          <a href="/crm/tasks" className="block px-3 py-2 text-cream rounded-lg hover:bg-char-3 text-sm transition-colors">
            Tarefas
          </a>
          <a href="/crm/pipeline" className="block px-3 py-2 text-cream rounded-lg hover:bg-char-3 text-sm transition-colors">
            Pipeline
          </a>
          <a href="/crm/companies" className="block px-3 py-2 text-cream rounded-lg hover:bg-char-3 text-sm transition-colors">
            Empresas
          </a>
          <div className="pt-2 mt-2 border-t border-char-3 space-y-1">
            <a href="/crm/settings/organization" className="block px-3 py-2 text-cream/60 rounded-lg hover:bg-char-3 text-sm transition-colors">
              Organização
            </a>
            <a href="/crm/settings/team" className="block px-3 py-2 text-cream/60 rounded-lg hover:bg-char-3 text-sm transition-colors">
              Equipe
            </a>
            <a href="/crm/settings/custom-fields" className="block px-3 py-2 text-cream/60 rounded-lg hover:bg-char-3 text-sm transition-colors">
              Campos personalizados
            </a>
            <a href="/crm/settings/pipelines" className="block px-3 py-2 text-cream/60 rounded-lg hover:bg-char-3 text-sm transition-colors">
              Pipelines
            </a>
            <a href="/crm/settings/profile" className="block px-3 py-2 text-cream/60 rounded-lg hover:bg-char-3 text-sm transition-colors">
              Perfil
            </a>
          </div>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
    </CommandPaletteProvider>
  )
}
