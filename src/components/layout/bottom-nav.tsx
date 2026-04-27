'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  MessageSquare,
  CheckSquare,
  Calendar,
  RefreshCw,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Início',  href: '/dashboard' },
  { icon: MessageSquare,   label: 'Chat',    href: '/chat' },
  { icon: CheckSquare,     label: 'Tarefas', href: '/tarefas' },
  { icon: Calendar,        label: 'Agenda',  href: '/agenda' },
  { icon: RefreshCw,       label: 'Rotinas', href: '/rotinas' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-char-2/95 backdrop-blur-md border-t border-char-3 flex items-center justify-around px-1 safe-area-pb md:hidden">
      {navItems.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-150 active:scale-95 ${
              active ? 'text-gold' : 'text-muted hover:text-cream'
            }`}
          >
            {/* Pill indicator acima do ícone */}
            <span className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-200 ${
              active ? 'w-5 bg-gold' : 'w-0 bg-gold'
            }`} />
            <Icon className={`w-5 h-5 transition-transform duration-150 ${active ? 'scale-110' : ''}`} />
            <span className={`text-[10px] transition-all ${active ? 'font-medium' : 'font-normal'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
