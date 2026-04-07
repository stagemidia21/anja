---
phase: 01-fundacao
plan: "03"
subsystem: database-auth
tags: [supabase, schema, rls, ssr, rate-limiting]
dependency_graph:
  requires: ["01-01"]
  provides: [supabase-schema, supabase-clients]
  affects: [auth, chat, tasks, billing]
tech_stack:
  added: ["@supabase/ssr"]
  patterns: [row-level-security, postgresql-functions, server-client-separation]
key_files:
  created:
    - supabase/migrations/00001_initial_schema.sql
    - src/lib/supabase/server.ts
    - src/lib/supabase/client.ts
    - src/lib/supabase/middleware.ts
  modified: []
decisions:
  - "messages tabela e append-only: sem UPDATE/DELETE por design para integridade do historico"
  - "check_and_increment_usage usa SECURITY DEFINER + FOR UPDATE para atomicidade sem race condition"
  - "updateSession retorna { supabaseResponse, user } para que o middleware principal controle redirects"
  - "executivo/agencias usam message_limit=-1 para indicar ilimitado na funcao SQL"
metrics:
  duration: "3 min"
  completed: "2026-04-07"
  tasks_completed: 2
  files_created: 4
---

# Phase 01 Plan 03: Supabase Schema e Clientes SSR — Summary

Schema SQL completo com 7 tabelas, RLS em todas, function de rate limiting atomica com FOR UPDATE, trigger de auto-criacao de profile/plan no signup, e os 3 clientes Supabase (@supabase/ssr) para Server Components, Client Components e middleware.

## O que foi entregue

### Task 1: Schema SQL (`supabase/migrations/00001_initial_schema.sql`)

7 tabelas criadas com RLS habilitado em todas:

| Tabela | Proposito |
|--------|-----------|
| `profiles` | Extende auth.users — nome, avatar, whitelabel |
| `user_plans` | Plano ativo, limites, Stripe IDs |
| `oauth_tokens` | Tokens Google OAuth2 com UNIQUE(user_id, provider) |
| `conversations` | Sessoes de chat com a Anja |
| `messages` | Historico append-only com tool_invocations JSONB |
| `tasks` | Kanban com prioridade, status e posicao para DnD |
| `usage_monthly` | Contagem de mensagens com year_month como chave natural |

**RLS:** 4 policies por tabela (SELECT/INSERT/UPDATE/DELETE) usando `auth.uid()`. `messages` tem apenas SELECT + INSERT (append-only por design).

**Functions:**
- `check_and_increment_usage`: atomica com `FOR UPDATE`, suporta planos ilimitados (limit=-1), verifica `auth.uid() = p_user_id` internamente
- `handle_new_user`: trigger `on_auth_user_created` que auto-cria profile + user_plan no signup

**Indexes:** 4 indexes de performance para queries criticas (messages por conversation, tasks por status, usage por periodo, conversations por usuario).

### Task 2: Clientes Supabase

| Arquivo | Contexto | Export |
|---------|----------|--------|
| `src/lib/supabase/server.ts` | Server Components, Route Handlers | `createClient()` |
| `src/lib/supabase/client.ts` | Client Components (browser) | `createBrowserClient()` |
| `src/lib/supabase/middleware.ts` | Middleware Next.js | `updateSession()` |

Padrao correto aplicado:
- `@supabase/ssr` exclusivamente (nao `auth-helpers-nextjs` deprecated)
- `getUser()` em todo lugar — zero usos de `getSession()`
- `updateSession` retorna `{ supabaseResponse, user }` — design que permite ao `middleware.ts` principal decidir redirects sem reprocessar auth

## Verificacao

```
CREATE TABLE count:               7 / 7
ENABLE ROW LEVEL SECURITY count:  7 / 7
check_and_increment_usage:        presente (FOR UPDATE)
handle_new_user + trigger:        presente
CREATE INDEX count:               4 / >= 3
getSession em src/lib/supabase:   0 ocorrencias
auth-helpers em src/:             0 ocorrencias
npx next build:                   PASSED (sem erros)
```

## Deviations from Plan

### Auto-fixed Issues

Nenhum bug encontrado. Dois ajustes menores de implementacao:

**1. [Rule 2 - Security] Verificacao auth.uid() dentro da function SQL**
- Encontrado em: Task 1
- Ajuste: A function `check_and_increment_usage` inclui verificacao `auth.uid() != p_user_id` como camada extra de segurança alem do SECURITY DEFINER, conforme documentado na ameaca T-01-03-03
- Arquivos: `supabase/migrations/00001_initial_schema.sql`

**2. [Rule 2 - Completeness] Quarto index adicionado**
- Encontrado em: Task 1
- Ajuste: Adicionado `idx_conversations_user` (user_id + updated_at DESC) alem dos 3 indexes especificados, pois conversations sera consultada com frequencia para listar historico
- Arquivos: `supabase/migrations/00001_initial_schema.sql`

## Commits

| Task | Hash | Descricao |
|------|------|-----------|
| 1 | fc4a63a | feat(01-03): add Supabase initial schema SQL with RLS and functions |
| 2 | ba85d1c | feat(01-03): add Supabase SSR clients (server, client, middleware) |

## Known Stubs

Nenhum stub. Os arquivos SQL e TypeScript sao infraestrutura — nao ha dados hardcoded nem placeholders de UI.

## Self-Check: PASSED
