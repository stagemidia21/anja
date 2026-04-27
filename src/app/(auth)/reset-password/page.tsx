'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AnjaSymbol } from '@/components/brand/anja-logo';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Senha precisa ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) {
      setError('Não foi possível atualizar a senha. O link pode ter expirado — peça um novo.');
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
    setTimeout(() => router.push('/dashboard'), 1500);
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <AnjaSymbol size={72} variant="dark" />
        </div>
        <h1 className="font-display text-gold text-3xl font-normal tracking-[0.25em] uppercase">Anja</h1>
        <p className="text-[10px] text-gold/50 mt-1.5 tracking-[0.3em] uppercase">Definir nova senha</p>
      </div>

      <div className="bg-char-2 border border-char-3/80 rounded-2xl p-7 shadow-2xl shadow-black/60">
        <h2 className="text-sm font-semibold text-cream mb-5 tracking-wide">Nova senha</h2>

        {done ? (
          <div className="bg-success/10 border border-success/20 rounded-lg px-3 py-3">
            <p className="text-sm text-success">Senha atualizada. Redirecionando...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="text-xs text-muted mb-1.5 block">Nova senha</label>
              <Input
                id="password" type="password" placeholder="Mínimo 6 caracteres"
                value={password} onChange={(e) => setPassword(e.target.value)}
                required autoComplete="new-password" autoFocus
              />
            </div>
            <div>
              <label htmlFor="confirm" className="text-xs text-muted mb-1.5 block">Confirmar senha</label>
              <Input
                id="confirm" type="password" placeholder="Repita a senha"
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
                required autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/20 rounded-lg px-3 py-2.5">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            <div className="pt-1">
              <Button type="submit" variant="primary" loading={loading} className="w-full glow-gold-sm btn-press">
                Salvar nova senha
              </Button>
            </div>
          </form>
        )}

        <div className="mt-5 pt-5 border-t border-char-3/60 text-center">
          <Link href="/login" className="text-sm text-muted hover:text-cream transition-colors">
            Voltar para login
          </Link>
        </div>
      </div>

      <p className="text-center text-[11px] text-muted/40 mt-6 tracking-wider uppercase">
        Stage Mídia · {new Date().getFullYear()}
      </p>
    </div>
  );
}
