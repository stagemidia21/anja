'use client';

import { ButtonHTMLAttributes } from 'react';
import { Spinner } from './spinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20',
  secondary: 'bg-char-3 border border-char-3 text-cream hover:bg-char-3/80',
  ghost:     'text-muted hover:text-cream hover:bg-char-3',
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={`px-4 py-2.5 text-sm font-normal rounded-lg transition-colors duration-150 inline-flex items-center justify-center gap-2 ${variantClasses[variant]} ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      <span className={loading ? 'opacity-60' : ''}>{children}</span>
    </button>
  );
}
