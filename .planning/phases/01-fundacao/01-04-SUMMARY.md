---
phase: 01-fundacao
plan: "04"
subsystem: auth
tags: [auth, middleware, supabase, oauth, login, signup]
dependency_graph:
  requires: ["01-02", "01-03"]
  provides: ["auth-middleware", "login-page", "signup-page", "auth-callback"]
  affects: ["all protected routes", "user session lifecycle"]
tech_stack:
  added: []
  patterns: ["@supabase/ssr updateSession", "force-dynamic auth pages", "PKCE OAuth flow"]
key_files:
  created:
    - src/middleware.ts
    - src/app/(auth)/layout.tsx
    - src/app/(auth)/auth-form.tsx
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/signup/page.tsx
    - src/app/auth/callback/route.ts
  modified: []
decisions:
  - "Auth layout uses force-dynamic to prevent static prerender — Supabase client fails without env vars at build time"
  - "AuthForm is a single 'use client' component with mode prop — avoids code duplication between login and signup"
  - "Middleware placed at src/middleware.ts (not root) — tsconfig @/* maps to src/, confirmed by paths config"
metrics:
  duration: "~18 minutes"
  completed: "2026-04-07T19:31:00Z"
  tasks_completed: 2
  files_created: 6
---

# Phase 01 Plan 04: Auth Pages and Route Protection Summary

Implementação completa de auth: middleware de proteção de rotas com refresh de token, páginas /login e /signup com Google OAuth + email/senha, e callback handler para processamento do code de autorização.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Middleware de proteção de rotas | fdc15cc | src/middleware.ts |
| 2 | Páginas de auth (login, signup, callback) | 84d5af0 | src/app/(auth)/layout.tsx, auth-form.tsx, login/page.tsx, signup/page.tsx, src/app/auth/callback/route.ts |

## What Was Built

**Middleware (`src/middleware.ts`):**
- Chama `updateSession()` em toda request — garante refresh de token via `getUser()` para evitar logout silencioso após 1h
- Redireciona `/dashboard`, `/chat`, `/tarefas`, `/agenda` para `/login` quando não autenticado
- Redireciona `/login` e `/signup` para `/dashboard` quando já autenticado
- Matcher exclui static assets para performance
- Zero chamadas a `getSession()` — validação exclusivamente server-side

**Auth Pages:**
- `AuthForm` component com `'use client'` e prop `mode: 'login' | 'signup'`
- Botão "Entrar com Google" com ícone SVG inline do Google e estado loading (3 dots bounce)
- Form email/senha com componentes `Button` e `Input` do design system
- Copy em PT-BR conforme UI-SPEC: "Entrar na conta", "Criar conta", "Entrar com Google"
- Mensagens de erro: "E-mail ou senha incorretos.", "Não foi possível conectar ao Google.", "Algo deu errado."
- Link de alternância entre /login e /signup
- Zero `font-medium` — apenas `font-normal` e `font-semibold`

**Callback (`src/app/auth/callback/route.ts`):**
- Processa `code` via `exchangeCodeForSession()`
- Redireciona para `/dashboard` (ou path `next` personalizado) após autenticação
- Redireciona para `/login?error=auth_failed` em caso de erro

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Auth pages failing static prerender at build time**
- **Found during:** Task 2 build verification
- **Issue:** Next.js tentou fazer prerender estático de `/login` e `/signup`. O `createBrowserClient()` inicializado fora de handlers de evento no `AuthForm` faz o `@supabase/ssr` falhar durante build porque `NEXT_PUBLIC_SUPABASE_URL` não está disponível no ambiente de build.
- **Fix:** Adicionado `export const dynamic = 'force-dynamic'` no `src/app/(auth)/layout.tsx` — pages de auth nunca devem ser estáticas pois dependem de estado de sessão.
- **Files modified:** `src/app/(auth)/layout.tsx`
- **Commit:** 84d5af0 (incluído no commit da task)

## Known Stubs

Nenhum stub presente. Google OAuth está implementado funcionalmente — o botão "Entrar com Google" chama `signInWithOAuth` corretamente. As credenciais do Google OAuth (configuração no Supabase Dashboard) são pré-requisito de infraestrutura, não um stub de código.

## Threat Flags

Nenhuma superfície nova além do threat model documentado no plano.

## Self-Check: PASSED

- [x] `src/middleware.ts` — FOUND
- [x] `src/app/(auth)/login/page.tsx` — FOUND
- [x] `src/app/(auth)/signup/page.tsx` — FOUND
- [x] `src/app/(auth)/auth-form.tsx` — FOUND
- [x] `src/app/(auth)/layout.tsx` — FOUND
- [x] `src/app/auth/callback/route.ts` — FOUND
- [x] Commit fdc15cc — FOUND
- [x] Commit 84d5af0 — FOUND
- [x] Build passes — CONFIRMED (ƒ Dynamic: /login, /signup, /auth/callback)
- [x] Zero font-medium — CONFIRMED
- [x] Zero getSession — CONFIRMED
