'use client';

import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-char-2 border border-char-3 rounded-lg p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
