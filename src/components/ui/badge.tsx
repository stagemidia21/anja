'use client';

import { HTMLAttributes } from 'react';

type BadgeVariant = 'free' | 'essencial' | 'executivo' | 'agencias' | 'default';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  free:      'text-muted bg-char-3 border border-char-3',
  essencial: 'text-gold bg-gold/10 border border-gold/20',
  executivo: 'text-gold bg-gold/10 border border-gold/20',
  agencias:  'text-gold-light bg-gold/15 border border-gold/30',
  default:   'text-muted bg-char-3 border border-char-3',
};

export function Badge({
  variant = 'default',
  children,
  className = '',
  ...props
}: BadgeProps) {
  return (
    <span
      className={`text-[10px] font-normal px-2 py-0.5 rounded inline-flex items-center ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
