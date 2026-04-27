'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AnjaSymbol } from '@/components/brand/anja-logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const supabase = createBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (err) {
      setError('Não foi possível enviar o e-mail. Tente novamente.');
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <AnjaSymbol size={72} variant="dark" />
        </div>
        <h1 className="font-display text-gold text-3xl font-normal tracking-[0.25em] uppercase">Anja</h1>
        <p className="text-[10px] text-gold/50 mt-1.5 tracking-[0.3em] uppercase">Recuperar acesso</p>
      </div>

      <div className="bg-char-2 border border-char-3/80 rounded-2xl p-7 shadow-2xl shadow-black/60">
        <h2 className="text-sm font-semibold text-cream mb-2 tracking-wide">Esqueci minha senha</h2>
        <p className="text-xs text-muted mb-5 leading-relaxed">
          Informe seu e-mail e enviamos um link para redefinir a senha.
        </p>

        {sent ? (
          <div className="space-y-4">
            <div className="bg-success/10 border border-success/20 rounded-lg px-3 py-3">
              <p className="text-sm text-success">
                Link enviado para <strong>{email}</strong>. Cheque sua caixa de entrada (e o spam).
              </p>
            </div>
            <Link href="/login" className="block text-center text-sm text-gold hover:text-gold-light underline underline-offset-2">
              Voltar para login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-xs text-muted mb-1.5 block">E-mail</label>
              <Input
                id="email" type="email" placeholder="seu@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required autoComplete="email" autoFocus
              />
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/20 rounded-lg px-3 py-2.5">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            <div className="pt-1">
              <Button type="submit" variant="primary" loading={loading} className="w-full glow-gold-sm btn-press">
                Enviar link
              </Button>
            </div>
          </form>
        )}

        <div className="mt-5 pt-5 border-t border-char-3/60 text-center">
          <p className="text-sm text-muted">
            Lembrou a senha?{' '}
            <Link href="/login" className="text-gold hover:text-gold-light transition-colors underline underline-offset-2">
              Voltar para login
            </Link>
          </p>
        </div>
      </div>

      <p className="text-center text-[11px] text-muted/40 mt-6 tracking-wider uppercase">
        Stage Mídia · {new Date().getFullYear()}
      </p>
    </div>
  );
}
