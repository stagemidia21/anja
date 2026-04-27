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
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group ${
        active
          ? 'bg-gold/10 text-gold'
          : 'text-muted hover:text-cream hover:bg-char-3/60'
      }`}
    >
      {/* Left indicator */}
      <span className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full transition-all duration-200 ${
        active ? 'bg-gold opacity-100' : 'bg-gold opacity-0 group-hover:opacity-30'
      }`} />
      <Icon className="w-[18px] h-[18px] shrink-0" />
      <span className="text-sm font-normal hidden lg:block">{label}</span>
    </Link>
  );
}
