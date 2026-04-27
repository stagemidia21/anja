'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, MessageSquare, CheckSquare, Calendar, Settings, LogOut, RefreshCw, Briefcase } from 'lucide-react';
import { SidebarItem } from './sidebar-item';
import { Badge } from '@/components/ui/badge';
import { createBrowserClient } from '@/lib/supabase/client';
import { AnjaSymbol } from '@/components/brand/anja-logo';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',    href: '/dashboard' },
  { icon: MessageSquare,   label: 'Chat',          href: '/chat' },
  { icon: CheckSquare,     label: 'Tarefas',       href: '/tarefas' },
  { icon: Calendar,        label: 'Agenda',        href: '/agenda' },
  { icon: Briefcase,       label: 'CRM',           href: '/crm' },
  { icon: Settings,        label: 'Configurações', href: '/configuracoes' },
];

const secondaryItems = [
  { icon: RefreshCw, label: 'Rotinas', href: '/rotinas' },
];

type Plan = 'free' | 'essencial' | 'executivo' | 'agencias';
const planLabels: Record<string, string> = { free: 'Free', essencial: 'Essencial', executivo: 'Executivo', agencias: 'Agências' };

interface SidebarProps {
  user: { name: string; plan: string } | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserClient();

  const initial = user?.name?.charAt(0).toUpperCase() ?? 'U';
  const planVariant = (user?.plan ?? 'free') as Plan;
  const planLabel = planLabels[planVariant] ?? 'Free';

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <aside className="hidden md:flex flex-col bg-char-2 border-r border-char-3 sticky top-0 h-screen w-14 lg:w-56 transition-all duration-200 shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-char-3/60 flex items-center gap-3">
        <AnjaSymbol size={32} variant="dark" className="shrink-0" />
        <div className="hidden lg:flex flex-col">
          <span className="font-display text-gold text-xl font-normal tracking-[0.2em] uppercase leading-none">Anja</span>
          <span className="text-[9px] text-gold/40 tracking-[0.28em] uppercase mt-1">Secretária Executiva</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 flex flex-col overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <SidebarItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              active={pathname === item.href}
            />
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-char-3/60 space-y-0.5">
          <p className="text-[10px] text-muted/50 uppercase tracking-widest px-3 mb-1.5 hidden lg:block">Gestão</p>
          {secondaryItems.map((item) => (
            <SidebarItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              active={pathname === item.href}
            />
          ))}
        </div>
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-char-3/60 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gold/15 border border-gold/20 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-gold">{initial}</span>
          </div>
          <div className="hidden lg:flex flex-col min-w-0">
            <span className="text-sm font-medium text-cream truncate leading-tight">{user?.name ?? 'Usuário'}</span>
            <Badge variant={planVariant} className="mt-0.5 self-start">{planLabel}</Badge>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/8 transition-all duration-150 btn-press"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="hidden lg:block text-xs">Sair</span>
        </button>
      </div>
    </aside>
  );
}
