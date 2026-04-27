'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { PushBell } from '@/components/push-bell';

const pageTitles: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/chat':         'Chat',
  '/tarefas':      'Tarefas',
  '/agenda':       'Agenda',
  '/rotinas':      'Rotinas',
  '/configuracoes': 'Configurações',
};

interface HeaderProps {
  user: { name: string; plan: string } | null;
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? 'Anja';
  const initial = user?.name?.charAt(0).toUpperCase() ?? 'U';

  return (
    <header className="sticky top-0 z-40 bg-char-2/80 backdrop-blur-md border-b border-char-3 flex items-center justify-between px-4 md:px-6 h-14">
      <h1 className="text-sm font-semibold text-cream tracking-wide">{title}</h1>
      <div className="flex items-center gap-2">
        <PushBell />
        <Link href="/configuracoes" aria-label="Configurações"
          className="w-8 h-8 rounded-full bg-gold/15 border border-gold/20 flex items-center justify-center hover:bg-gold/25 transition-colors">
          <span className="text-sm font-medium text-gold">{initial}</span>
        </Link>
      </div>
    </header>
  );
}
