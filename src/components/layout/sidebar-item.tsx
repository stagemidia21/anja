'use client';

import Link from 'next/link';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  active: boolean;
}

export function SidebarItem({ icon: Icon, label, href, active }: SidebarItemProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 ${
        active
          ? 'bg-gold/10 text-gold border border-gold/20'
          : 'text-muted hover:text-cream hover:bg-char-3'
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-sm font-normal hidden lg:block">{label}</span>
    </Link>
  );
}
