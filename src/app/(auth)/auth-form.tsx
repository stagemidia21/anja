'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AnjaSymbol } from '@/components/brand/anja-logo';

interface AuthFormProps {
  mode: 'login' | 'signup';
}

export function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === 'login') {
      const result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) {
        setError('E-mail ou senha incorretos.');
        setLoading(false);
        return;
      }
      window.location.href = '/dashboard';
    } else {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Erro ao criar conta. Tente novamente.');
        setLoading(false);
        return;
      }
      const loginResult = await supabase.auth.signInWithPassword({ email, password });
      if (loginResult.error) {
        setSuccess('Conta criada! Entre com seu e-mail e senha.');
        setLoading(false);
        return;
      }
      window.location.href = '/dashboard';
    }
  }

  const isLogin = mode === 'login';

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <AnjaSymbol size={72} variant="dark" />
        </div>
        <h1 className="font-display text-gold text-3xl font-normal tracking-[0.25em] uppercase">Anja</h1>
        <p className="text-[10px] text-gold/50 mt-1.5 tracking-[0.3em] uppercase">Secretária Executiva Digital</p>
      </div>

      {/* Card */}
      <div className="bg-char-2 border border-char-3/80 rounded-2xl p-7 shadow-2xl shadow-black/60">
        <h2 className="text-sm font-semibold text-cream mb-5 tracking-wide">
          {isLogin ? 'Entrar na conta' : 'Criar sua conta'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="text-xs text-muted mb-1.5 block">E-mail</label>
            <Input
              id="email" type="email" placeholder="seu@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-xs text-muted mb-1.5 block">Senha</label>
            <Input
              id="password" type="password"
              placeholder={isLogin ? '••••••••' : 'Mínimo 6 caracteres'}
              value={password} onChange={(e) => setPassword(e.target.value)}
              required autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/20 rounded-lg px-3 py-2.5 fade-up">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-success/10 border border-success/20 rounded-lg px-3 py-2.5 fade-up">
              <p className="text-sm text-success">{success}</p>
            </div>
          )}

          <div className="pt-1">
            <Button type="submit" variant="primary" loading={loading} className="w-full glow-gold-sm btn-press">
              {isLogin ? 'Entrar' : 'Criar conta'}
            </Button>
          </div>

          {isLogin && (
            <div className="text-right">
              <Link href="/forgot-password" className="text-xs text-muted hover:text-gold transition-colors">
                Esqueci minha senha
              </Link>
            </div>
          )}
        </form>

        <div className="mt-5 pt-5 border-t border-char-3/60 text-center">
          <p className="text-sm text-muted">
            {isLogin ? (
              <>Não tem conta?{' '}
                <Link href="/signup" className="text-gold hover:text-gold-light transition-colors underline underline-offset-2">
                  Criar conta
                </Link>
              </>
            ) : (
              <>Já tem conta?{' '}
                <Link href="/login" className="text-gold hover:text-gold-light transition-colors underline underline-offset-2">
                  Entrar
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Footer discreto */}
      <p className="text-center text-[11px] text-muted/40 mt-6 tracking-wider uppercase">
        Stage Mídia · {new Date().getFullYear()}
      </p>
    </div>
  );
}
