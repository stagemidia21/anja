'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, ListChecks, GanttChart, Building2, Settings } from 'lucide-react'

const TABS = [
  { href: '/crm', label: 'Início', icon: LayoutDashboard, exact: true },
  { href: '/crm/contacts', label: 'Contatos', icon: Users },
  { href: '/crm/tasks', label: 'Tarefas', icon: ListChecks },
  { href: '/crm/pipeline', label: 'Pipeline', icon: GanttChart },
  { href: '/crm/companies', label: 'Empresas', icon: Building2 },
  { href: '/crm/settings/organization', label: 'Configurações', icon: Settings, prefix: '/crm/settings' },
]

export function CrmTabs() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 flex-wrap items-center">
      {TABS.map(({ href, label, icon: Icon, exact, prefix }) => {
        const active = exact
          ? pathname === href
          : prefix
            ? pathname.startsWith(prefix)
            : pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ' +
              (active
                ? 'bg-gold/15 text-gold border border-gold/30'
                : 'text-cream/70 hover:text-cream hover:bg-char-3 border border-transparent')
            }
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
