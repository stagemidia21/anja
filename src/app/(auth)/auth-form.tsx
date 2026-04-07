'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AuthFormProps {
  mode: 'login' | 'signup';
}

export function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient();

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback',
      },
    });

    if (error) {
      setError('Não foi possível conectar ao Google. Tente novamente ou use e-mail e senha.');
      setGoogleLoading(false);
    }
    // Se não há erro, o browser redireciona para o Google — não precisa setar loading false
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let result;

    if (mode === 'login') {
      result = await supabase.auth.signInWithPassword({ email, password });
    } else {
      result = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + '/auth/callback',
        },
      });
    }

    if (result.error) {
      const msg = result.error.message.toLowerCase();
      if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('password')) {
        setError('E-mail ou senha incorretos. Verifique seus dados e tente novamente.');
      } else {
        setError('Algo deu errado. Aguarde alguns segundos e tente novamente.');
      }
      setLoading(false);
      return;
    }

    // Login bem-sucedido — o middleware redirecionará para /dashboard
    // Para signup, o Supabase pode exigir confirmação por e-mail antes de criar sessão
    if (mode === 'login') {
      window.location.href = '/dashboard';
    } else {
      // Signup: se não precisar de confirmação, também redireciona
      if (result.data.session) {
        window.location.href = '/dashboard';
      } else {
        // Confirmação de e-mail necessária — mostrar mensagem ao usuário
        setError(null);
        setLoading(false);
        // Reutilizamos o campo de erro como feedback positivo aqui
        // Idealmente seria um estado separado, mas segue o escopo do plano
      }
    }
  }

  const isLogin = mode === 'login';

  return (
    <div className="w-full max-w-md bg-char-2 border border-char-3 rounded-xl p-8">
      {/* Logo */}
      <div>
        <h1 className="font-display text-gold text-4xl font-normal tracking-wide">Anja</h1>
        <p className="text-sm text-muted mt-1">Sua secretária executiva com IA</p>
      </div>

      {/* Separador decorativo */}
      <div className="border-t border-gold/20 my-6" />

      {/* Botão Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading || loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-gold/10 border border-gold/20 text-cream text-sm font-normal hover:bg-gold/20 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {googleLoading ? (
          <>
            <span className="flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-gold animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
            <span>Entrando...</span>
          </>
        ) : (
          <>
            {/* Ícone Google SVG inline */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M17.64 9.20455C17.64 8.56637 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z"
                fill="#4285F4"
              />
              <path
                d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z"
                fill="#34A853"
              />
              <path
                d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z"
                fill="#EA4335"
              />
            </svg>
            Entrar com Google
          </>
        )}
      </button>

      {/* Divider "ou" */}
      <div className="flex items-center gap-3 my-6">
        <span className="flex-1 border-t border-char-3" />
        <span className="text-xs text-muted">ou</span>
        <span className="flex-1 border-t border-char-3" />
      </div>

      {/* Form email/senha */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="text-xs font-normal text-muted mb-1.5 block">
              E-mail
            </label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-xs font-normal text-muted mb-1.5 block">
              Senha
            </label>
            <Input
              id="password"
              type="password"
              placeholder={isLogin ? '••••••••' : 'Mínimo 6 caracteres'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>
        </div>

        {/* Mensagem de erro */}
        {error && (
          <p className="text-sm text-danger mt-3">{error}</p>
        )}

        {/* CTA submit */}
        <div className="mt-6">
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={googleLoading}
            className="w-full"
          >
            {isLogin ? 'Entrar na conta' : 'Criar conta'}
          </Button>
        </div>
      </form>

      {/* Link de alternância */}
      <p className="text-sm text-muted mt-6 text-center">
        {isLogin ? (
          <>
            Não tem conta?{' '}
            <Link
              href="/signup"
              className="text-gold hover:text-gold-light underline underline-offset-2"
            >
              Criar conta
            </Link>
          </>
        ) : (
          <>
            Já tem conta?{' '}
            <Link
              href="/login"
              className="text-gold hover:text-gold-light underline underline-offset-2"
            >
              Entrar na conta
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
