'use client'
import { useState } from 'react'
import { ChevronDown, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { switchOrg } from '@/lib/crm/org-switcher'

type Org = { id: string; name: string; slug: string; role: string }

export function OrgSwitcher({
  orgs,
  currentOrgId,
}: {
  orgs: Org[]
  currentOrgId: string | null
}) {
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

  const currentOrg = orgs.find(o => o.id === currentOrgId)

  async function handleSwitch(orgId: string) {
    if (orgId === currentOrgId || switching) return
    setSwitching(true)
    setOpen(false)

    const result = await switchOrg(orgId)
    if (result.error) {
      setSwitching(false)
      return
    }

    // Refresh session → triggers custom_access_token_hook → new JWT with new organization_id
    const supabase = createClient()
    await supabase.auth.refreshSession()

    // Remove all Realtime channels so they resubscribe with the new org's JWT context
    await supabase.removeAllChannels()

    // Hard navigate to reload RSC tree with new org context
    window.location.href = '/crm'
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 text-cream hover:bg-char-3 rounded-lg transition-colors"
        disabled={switching}
      >
        <Building2 size={16} className="text-gold shrink-0" />
        <span className="flex-1 text-left text-sm truncate">
          {switching ? 'Trocando...' : (currentOrg?.name ?? 'Sem organização')}
        </span>
        <ChevronDown size={14} className="text-cream shrink-0 opacity-60" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-full bg-char-2 border border-char-3 rounded-lg shadow-xl z-50 py-1">
          {orgs.map(org => (
            <button
              key={org.id}
              onClick={() => handleSwitch(org.id)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-char-3 transition-colors ${
                org.id === currentOrgId ? 'text-gold' : 'text-cream'
              }`}
            >
              {org.name}
              {org.id === currentOrgId && (
                <span className="ml-2 text-xs text-gold opacity-70">atual</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
