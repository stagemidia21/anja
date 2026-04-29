import { requireUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgs } from '@/lib/crm/org-switcher'
import { OrgSwitcher } from '@/components/layout/OrgSwitcher'
import { CommandPaletteProvider } from '@/components/layout/CommandPaletteProvider'
import { CrmTabs } from '@/components/layout/CrmTabs'

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const supabase = createClient()

  const [orgs, profileResult] = await Promise.all([
    getUserOrgs(),
    supabase.from('profiles').select('active_organization_id').eq('id', user.id).single(),
  ])

  return (
    <CommandPaletteProvider>
      <div className="space-y-4">
        <div className="bg-char-2 border border-char-3 rounded-xl px-4 py-3 flex items-center gap-4 flex-wrap">
          <div className="min-w-[200px] max-w-xs">
            <OrgSwitcher
              orgs={orgs}
              currentOrgId={profileResult.data?.active_organization_id ?? null}
            />
          </div>
          <div className="flex-1 min-w-0 overflow-x-auto">
            <CrmTabs />
          </div>
        </div>
        <div>{children}</div>
      </div>
    </CommandPaletteProvider>
  )
}
