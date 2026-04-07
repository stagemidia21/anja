'use client';

import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/chat':      'Chat',
  '/tarefas':   'Tarefas',
  '/agenda':    'Agenda',
};

type Plan = 'free' | 'essencial' | 'executivo' | 'agencias';

const planLabels: Record<string, string> = {
  free:      'Free',
  essencial: 'Essencial',
  executivo: 'Executivo',
  agencias:  'Agências',
};

interface HeaderProps {
  user: { name: string; plan: string } | null;
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? 'Anja';

  const initial = user?.name?.charAt(0).toUpperCase() ?? 'U';
  const planVariant = (user?.plan ?? 'free') as Plan;
  const planLabel = planLabels[planVariant] ?? 'Free';

  return (
    <header className="sticky top-0 z-40 bg-char-2 border-b border-char-3 flex items-center justify-between px-4 md:px-6 py-3 h-14">
      <h1 className="text-xl font-semibold text-cream">{title}</h1>

      <div className="flex items-center gap-3">
        <Badge variant={planVariant} className="hidden md:inline-flex">
          {planLabel}
        </Badge>
        <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
          <span className="text-sm font-normal text-gold">{initial}</span>
        </div>
      </div>
    </header>
  );
}
