'use client';

import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  CheckSquare,
  Calendar,
} from 'lucide-react';
import { SidebarItem } from './sidebar-item';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: MessageSquare,   label: 'Chat',       href: '/chat' },
  { icon: CheckSquare,     label: 'Tarefas',    href: '/tarefas' },
  { icon: Calendar,        label: 'Agenda',     href: '/agenda' },
];

type Plan = 'free' | 'essencial' | 'executivo' | 'agencias';

const planLabels: Record<string, string> = {
  free:      'Free',
  essencial: 'Essencial',
  executivo: 'Executivo',
  agencias:  'Agências',
};

interface SidebarProps {
  user: { name: string; plan: string } | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const initial = user?.name?.charAt(0).toUpperCase() ?? 'U';
  const planVariant = (user?.plan ?? 'free') as Plan;
  const planLabel = planLabels[planVariant] ?? 'Free';

  return (
    <aside className="hidden md:flex flex-col bg-char-2 border-r border-char-3 sticky top-0 h-screen w-16 lg:w-56 transition-all duration-200">
      {/* Logo */}
      <div className="px-4 py-6 border-b border-char-3 flex items-center">
        <span className="font-display text-gold text-xl font-normal hidden lg:block">
          Anja
        </span>
        <span className="font-display text-gold text-xl font-normal lg:hidden">
          A
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => (
          <SidebarItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            active={pathname === item.href}
          />
        ))}
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-char-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
            <span className="text-sm font-normal text-gold">{initial}</span>
          </div>
          <div className="hidden lg:flex flex-col min-w-0">
            <span className="text-sm font-normal text-cream truncate">
              {user?.name ?? 'Usuario'}
            </span>
            <Badge variant={planVariant} className="mt-0.5 self-start">
              {planLabel}
            </Badge>
          </div>
        </div>
      </div>
    </aside>
  );
}
