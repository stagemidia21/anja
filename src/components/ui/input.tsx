'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, className = '', ...props }, ref) => {
    const errorClasses = error
      ? 'border-danger/60 focus:border-danger focus:ring-danger/20'
      : 'border-char-3 focus:border-gold/50 focus:ring-gold/20';

    return (
      <input
        ref={ref}
        className={`w-full bg-charcoal border ${errorClasses} rounded-lg px-3 py-2.5 text-sm text-cream placeholder:text-muted outline-none focus:ring-2 transition-colors duration-150 ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
