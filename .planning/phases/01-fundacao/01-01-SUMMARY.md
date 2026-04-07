---
phase: 01-fundacao
plan: 01
subsystem: infra
tags: [nextjs, typescript, tailwind, supabase, ai-sdk, npm]

# Dependency graph
requires: []
provides:
  - Next.js 14 App Router com TypeScript e Tailwind configurados
  - Dependencias de auth (@supabase/ssr, @supabase/supabase-js) instaladas
  - Vercel AI SDK (ai, @ai-sdk/anthropic) instalado
  - Root layout com lang="pt-BR" sem fontes (deferred para Plan 02)
  - .env.local.example com todos os placeholders de variaveis de ambiente
  - Git repo inicializado no diretorio do projeto
affects: [01-02, 01-03, 01-04, 01-05, todos os planos futuros]

# Tech tracking
tech-stack:
  added:
    - next@14.2.35
    - react@18
    - typescript
    - tailwindcss
    - "@supabase/ssr"
    - "@supabase/supabase-js"
    - lucide-react
    - ai (Vercel AI SDK)
    - "@ai-sdk/anthropic"
  patterns:
    - App Router com src/ directory e alias @/*
    - Server Components como padrao (nenhum use client ainda)

key-files:
  created:
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/app/globals.css
    - package.json
    - tsconfig.json
    - next.config.mjs
    - tailwind.config.ts
    - .env.local.example
    - .gitignore
  modified: []

key-decisions:
  - "Git inicializado como repo independente em projetos/anja/ (nao como parte do ccos-ratos)"
  - "Fontes Cormorant Garamond + DM Sans deixadas para Plan 02 conforme instrucao"
  - "@supabase/auth-helpers-nextjs nao instalado — usar apenas @supabase/ssr (oficial App Router)"
  - "Vercel AI SDK instalado agora para evitar refatoracao futura"

patterns-established:
  - "Imports com alias @/* (ex: @/utils/supabase/server)"
  - ".env*.local coberto pelo .gitignore — nunca commitar segredos"

requirements-completed: []

# Metrics
duration: 7min
completed: 2026-04-07
---

# Phase 01 Plan 01: Setup do Projeto Next.js e Dependencias

**Next.js 14.2.35 com App Router, TypeScript e Tailwind criado do zero, com @supabase/ssr e Vercel AI SDK instalados e repo git proprio inicializado**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-07T19:07:22Z
- **Completed:** 2026-04-07T19:15:00Z
- **Tasks:** 2
- **Files modified:** 29

## Accomplishments

- Projeto Next.js 14 criado via create-next-app com App Router, TypeScript, Tailwind e ESLint
- Root layout limpo com `lang="pt-BR"`, sem fontes (deferred para Plan 02 conforme spec)
- Todas as dependencias instaladas: @supabase/ssr, @supabase/supabase-js, lucide-react, ai, @ai-sdk/anthropic
- .env.local.example criado com todos os placeholders de variaveis (Supabase, Google OAuth, Anthropic)
- Git repo proprio inicializado e commit inicial criado

## Task Commits

1. **Task 1 + Task 2: Setup completo** - `6dc45a0` (feat)

**Nota:** As duas tasks foram agrupadas no commit inicial do repositorio (`root-commit`), pois o git foi inicializado apos a criacao do projeto.

## Files Created/Modified

- `src/app/layout.tsx` - Root layout com metadata em PT-BR, sem fontes (Plan 02)
- `src/app/page.tsx` - Placeholder simples com heading "Anja"
- `src/app/globals.css` - CSS base gerado pelo create-next-app (sera reescrito no Plan 02)
- `package.json` - Next.js 14 + todas as deps da Fase 1
- `tsconfig.json` - TypeScript com paths alias @/*
- `next.config.mjs` - Config padrao do Next.js 14
- `tailwind.config.ts` - Tailwind com src/ como content path
- `.env.local.example` - Template de variaveis de ambiente sem valores reais
- `.gitignore` - Inclui node_modules, .env*.local, .next/

## Decisions Made

- **Git independente:** O diretorio `projetos/` ja esta no .gitignore do repo pai (ccos-ratos), entao foi inicializado um git proprio em `projetos/anja/`. Isso permite versionamento isolado do projeto SaaS.
- **Fontes adiadas:** create-next-app gerou layout com fontes Geist. Estas foram removidas conforme instrucao do plano — fontes Cormorant Garamond + DM Sans serao configuradas no Plan 02 com next/font/google.
- **Pasta fonts removida:** A pasta `src/app/fonts/` com as fontes Geist foi deletada, pois o projeto usara fontes Google via next/font no Plan 02.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Moveu .planning temporariamente para criar o projeto**
- **Found during:** Task 1 (create-next-app)
- **Issue:** create-next-app recusou criar projeto no diretorio nao-vazio com `.planning/` presente, mesmo com `--yes`
- **Fix:** Moveu `.planning/` para `/tmp/anja-planning-backup`, executou create-next-app, restaurou `.planning/`
- **Files modified:** Nenhum (operacao de filesystem temporaria)
- **Verification:** `.planning/` restaurada com sucesso, estrutura do projeto criada corretamente
- **Committed in:** `6dc45a0`

**2. [Rule 3 - Blocking] Inicializou git proprio no projeto**
- **Found during:** Commit (pos-Task 2)
- **Issue:** O diretorio `anja` nao tinha `.git` proprio — estava herdando o repo pai `ccos-ratos`, cujo auto-sync nao seria adequado para commits do projeto SaaS
- **Fix:** `git init` em `projetos/anja/` — valido pois `.gitignore` do pai ja ignorava `projetos/`
- **Files modified:** `.git/` (novo)
- **Verification:** `git rev-parse --show-toplevel` retorna `projetos/anja`
- **Committed in:** `6dc45a0` (root-commit)

---

**Total deviations:** 2 auto-fixed (ambas Rule 3 - Blocking)
**Impact on plan:** Ambas necessarias para execucao. Nenhuma expansao de escopo.

## Issues Encountered

- `create-next-app@14` reportou "contains files that could conflict" para `.planning/`. Resolvido movendo temporariamente.
- Git nao tinha user.email configurado no novo repo — configurado com dados do usuario (homero@stagemidiasol.com.br).

## User Setup Required

Nenhum servico externo configurado neste plano. Antes de iniciar o Plan 03 (Supabase schema), o usuario precisara:
- Criar projeto no Supabase
- Copiar `.env.local.example` para `.env.local` e preencher `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Next Phase Readiness

- Pronto para Plan 02: design system (CSS vars, Tailwind extend, grain texture, fontes)
- Estrutura App Router estabelecida com alias `@/*` para imports limpos
- Dependencias de auth e AI SDK ja instaladas — Plans 03 e 04 podem comecar sem instalacoes adicionais

---
*Phase: 01-fundacao*
*Completed: 2026-04-07*
