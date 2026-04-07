---
phase: 01-fundacao
plan: 05
subsystem: layout
status: complete
tags: [layout, sidebar, bottom-nav, header, navigation, responsive]
dependency_graph:
  requires: ["01-02", "01-04"]
  provides: ["dashboard-shell", "nav-structure"]
  affects: ["todas as páginas do dashboard"]
tech_stack:
  added: []
  patterns:
    - "AppShell com Sidebar + Header + BottomNav"
    - "Server Component layout com auth gate (getUser + redirect)"
    - "usePathname para estado ativo de nav items"
    - "Tailwind breakpoints para colapso de sidebar (md/lg)"
    - "safe-area-pb para iOS home indicator"
key_files:
  created:
    - src/components/layout/sidebar.tsx
    - src/components/layout/sidebar-item.tsx
    - src/components/layout/bottom-nav.tsx
    - src/components/layout/header.tsx
    - src/app/(dashboard)/layout.tsx
    - src/app/(dashboard)/dashboard/page.tsx
    - src/app/(dashboard)/chat/page.tsx
    - src/app/(dashboard)/tarefas/page.tsx
    - src/app/(dashboard)/agenda/page.tsx
  modified:
    - src/app/page.tsx
decisions:
  - "Header usa usePathname internamente (client component) em vez de receber prop title — elimina prop drilling"
  - "Sidebar é client component (precisa de usePathname), dados de user passados como props do layout server"
  - "DashboardLayout é server component — auth gate via getUser() + redirect antes de qualquer render"
metrics:
  duration: "~25min"
  completed: "2026-04-07"
  tasks_completed: 3
  tasks_total: 3
  files_created: 10
  files_modified: 1
---

# Phase 1 Plan 05: Dashboard Layout Summary

**One-liner:** AppShell responsivo com sidebar desktop collapsed/expanded via breakpoints Tailwind, bottom nav mobile com safe-area iOS, e auth gate via getUser() no Server Component layout.

---

## Tasks Completadas

| Task | Status | Commit | Descrição |
|------|--------|--------|-----------|
| Task 1: Sidebar, Bottom Nav e Header | DONE | 8b56e37 | 4 componentes de layout com design system exato |
| Task 2: Layout dashboard e páginas placeholder | DONE | 4bc313b | AppShell, 4 páginas placeholder, redirect da home |
| Task 3: Verificação visual | DONE | aprovado | Login funcional e layout do dashboard confirmados pelo fundador |

---

## O Que Foi Construído

### Componentes de Layout (`src/components/layout/`)

**`sidebar-item.tsx`** — Item de navegação individual:
- Props: `icon`, `label`, `href`, `active`
- `aria-label={label}` no Link (acessibilidade para estado collapsed)
- Estado ativo: `bg-gold/10 text-gold border border-gold/20`
- Estado inativo: `text-muted hover:text-cream hover:bg-char-3`
- Label oculta no breakpoint md: `hidden lg:block`

**`sidebar.tsx`** — Sidebar desktop:
- `hidden md:flex` — invisível no mobile
- `w-16 lg:w-56` — collapsed em 768px+, expanded em 1024px+
- Logo "Anja" em font-display text-gold (oculto collapsed → "A")
- 4 nav items com `usePathname` para estado ativo
- User info na base: avatar com inicial, nome e Badge de plano

**`bottom-nav.tsx`** — Navegação mobile:
- `fixed bottom-0 left-0 right-0 z-50` — fixa na base
- `safe-area-pb` — padding iOS com `env(safe-area-inset-bottom)`
- `md:hidden` — oculto em desktop
- 4 items: Dashboard, Chat, Tarefas, Agenda

**`header.tsx`** — Header das páginas:
- `sticky top-0 z-40 h-14` — 56px fixo, sticky
- Título dinâmico via `usePathname` + map de rotas
- Avatar do usuário + Badge de plano (`hidden md:inline-flex`)
- `font-semibold` no título, `font-normal` no restante

### AppShell (`src/app/(dashboard)/layout.tsx`)
- Server Component com `getUser()` — nunca `getSession`
- Redirect para `/login` se usuário não autenticado
- Busca `profiles.full_name` e `user_plans.plan` via Supabase
- Composição: `<Sidebar> + <Header> + <main> + <BottomNav>`
- `pb-20 md:pb-6` no main para espaço do bottom nav mobile

### Páginas Placeholder
- `/dashboard` — "Dashboard em construcao — conteudo chega na Fase 5."
- `/chat` — "Chat com a Anja — disponivel na Fase 2."
- `/tarefas` — "Gestao de tarefas — disponivel na Fase 4."
- `/agenda` — "Agenda — disponivel na Fase 3."

### Home redirect
- `src/app/page.tsx` — `redirect('/dashboard')` direto

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Header como client component com usePathname interno**
- **Found during:** Task 2
- **Issue:** Plano sugeria receber `title` como prop no layout. Mas o layout é Server Component e o Header é Client Component que precisa de `usePathname`. Passar o título como prop criaria acoplamento desnecessário e repetiria a lógica em cada página.
- **Fix:** Header lê pathname internamente com `usePathname()` e mapeia para título. Prop `title` removida — apenas `user` é necessário.
- **Files modified:** `src/components/layout/header.tsx`, `src/app/(dashboard)/layout.tsx`
- **Commit:** 8b56e37, 4bc313b

---

## Known Stubs

| Stub | Arquivo | Linha | Razão |
|------|---------|-------|-------|
| "Dashboard em construcao" | src/app/(dashboard)/dashboard/page.tsx | 3 | Conteúdo real na Fase 5 |
| "Chat com a Anja — disponivel na Fase 2" | src/app/(dashboard)/chat/page.tsx | 3 | Chat implementado na Fase 2 |
| "Gestao de tarefas — disponivel na Fase 4" | src/app/(dashboard)/tarefas/page.tsx | 3 | Tarefas implementadas na Fase 4 |
| "Agenda — disponivel na Fase 3" | src/app/(dashboard)/agenda/page.tsx | 3 | Agenda implementada na Fase 3 |

Stubs são intencionais — plano 01-05 cria estrutura de navegação, não conteúdo das páginas.

---

## Threat Flags

Nenhum. Implementação cobre T-01-05-01 e T-01-05-02 conforme threat model:
- T-01-05-01: Queries Supabase usam RLS — `eq('id', user.id)` retorna apenas dados do usuário autenticado.
- T-01-05-02: Layout verifica `getUser()` e redireciona para `/login` se null — auth gate duplo além do middleware.

---

## Self-Check

### Arquivos criados:
- [x] src/components/layout/sidebar.tsx — FOUND
- [x] src/components/layout/sidebar-item.tsx — FOUND
- [x] src/components/layout/bottom-nav.tsx — FOUND
- [x] src/components/layout/header.tsx — FOUND
- [x] src/app/(dashboard)/layout.tsx — FOUND
- [x] src/app/(dashboard)/dashboard/page.tsx — FOUND
- [x] src/app/(dashboard)/chat/page.tsx — FOUND
- [x] src/app/(dashboard)/tarefas/page.tsx — FOUND
- [x] src/app/(dashboard)/agenda/page.tsx — FOUND

### Commits:
- [x] 8b56e37 — feat(01-05): add sidebar, bottom nav, and header layout components
- [x] 4bc313b — feat(01-05): add dashboard layout and placeholder pages

### Build:
- [x] `npx next build` — passou sem erros (todas as rotas compiladas)

### Regras de design:
- [x] Zero `font-medium` em src/components/layout/ e src/app/(dashboard)/
- [x] `aria-label` presente no SidebarItem
- [x] `safe-area-pb` no BottomNav
- [x] `getUser()` usado (nunca getSession)

## Self-Check: PASSED
