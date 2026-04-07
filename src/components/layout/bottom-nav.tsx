'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  MessageSquare,
  CheckSquare,
  Calendar,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: MessageSquare,   label: 'Chat',       href: '/chat' },
  { icon: CheckSquare,     label: 'Tarefas',    href: '/tarefas' },
  { icon: Calendar,        label: 'Agenda',     href: '/agenda' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-char-2 border-t border-char-3 flex items-center justify-around px-2 safe-area-pb md:hidden">
      {navItems.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg ${
              active ? 'text-gold' : 'text-muted'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-normal">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
