---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: phase_complete
last_updated: "2026-04-07T21:30:00.000Z"
progress:
  total_phases: 7
  completed_phases: 2
  total_plans: 9
  completed_plans: 9
  percent: 100
---

# Anja — Project State

## Status

`PHASE_COMPLETE` — Fase 2 (Core IA) concluida. Todos os 4 plans executados e verificados.

## Fase atual

**Phase 2 — Core IA** | COMPLETA (4/4 plans) | Proxima: Phase 3 — Google Calendar

## Progresso

[####################] 100% (4/4 plans concluidos na Fase 2)

## Historico

- 2026-04-07: Projeto inicializado. Spec completo recebido do fundador. Pesquisa de mercado + tecnica concluida. REQUIREMENTS.md e ROADMAP.md criados.
- 2026-04-07: Plan 01-01 concluido. Next.js 14 criado, dependencias instaladas, git proprio inicializado. Commit: 6dc45a0
- 2026-04-07: Plan 01-02 concluido. Design system implementado: CSS vars RGB, grain texture, 3 fontes next/font, 5 componentes base. Commit: 7c465ee
- 2026-04-07: Plan 01-03 concluido. Schema SQL com 7 tabelas + RLS + rate limiting atomico + 3 clientes Supabase SSR. Commits: fc4a63a, ba85d1c
- 2026-04-07: Plan 01-04 concluido. Auth completa: middleware de protecao de rotas (updateSession/getUser), /login + /signup com Google OAuth + email/senha, /auth/callback. Commits: fdc15cc, 84d5af0
- 2026-04-07: Plan 01-05 concluido. AppShell responsivo com sidebar desktop (collapsed/expanded), bottom nav mobile (safe-area iOS), header dinamico, auth gate via getUser() no layout Server Component. Login funcional e dashboard layout verificados pelo fundador. Commits: 8b56e37, 4bc313b, fc1dec8
- 2026-04-07: Phase 2 concluida. Chat streaming com Anja implementado. Commit: 0ea292d

## Resultado da Fase 2 — 6 criterios de sucesso atendidos

- [x] POST /api/chat com streamText (AI SDK v6) + auth server-side
- [x] System prompt PT-BR com personalidade executiva da Anja
- [x] 4 tools definidas (calendar + tasks) com stubs seguros
- [x] Interface de chat com streaming visual, tool states, input bar
- [x] Historico de conversa persiste no Supabase entre sessoes
- [x] Rate limiting: usuario Free bloqueado apos 30 msgs/mes (429)

## Resultado da Fase 1 — 8 criterios de sucesso atendidos

- [x] Next.js 14 rodando em localhost:4000
- [x] Supabase conectado (schema com 7 tabelas + RLS)
- [x] Auth email/senha funcionando (login + signup)
- [x] Google OAuth configurado
- [x] Middleware protegendo rotas autenticadas
- [x] Design system com tokens, fontes e componentes base
- [x] AppShell com sidebar desktop + bottom nav mobile
- [x] Header dinamico com titulo por rota

## Credenciais (guardar em .env.local — NUNCA commitar)

- `TELEGRAM_BOT_TOKEN` — token do BotFather ja gerado (salvar em .env.local)
- `ANTHROPIC_API_KEY` — chave da API Anthropic ja configurada

## Decisoes tecnicas confirmadas

- **Streaming:** Vercel AI SDK v6 `useChat` (@ai-sdk/react) + `streamText` (nao SDK Anthropic raw)
- **useChat:** importar de `@ai-sdk/react` (nao `ai/react` — deprecado no v6)
- **streamText steps:** `stopWhen: stepCountIs(N)` (nao `maxSteps` — removido no v6)
- **streamText tokens:** `maxOutputTokens` (nao `maxTokens` — renomeado no v6)
- **Messages format:** `UIMessage` com `parts[]` (nao `Message` com `content: string` do v3)
- **Tool parts:** `type: 'dynamic-tool'` com estados `input-streaming/input-available/output-available`
- **Route response:** `result.toUIMessageStreamResponse()` (nao `toDataStreamResponse()`)
- **convertToModelMessages:** obrigatorio para converter UIMessage[] em ModelMessage[] no server
- **Auth:** `@supabase/ssr` (nao `auth-helpers-nextjs` deprecated)
- **Kanban:** `dnd-kit` (nao react-beautiful-dnd arquivado)
- **CSS vars:** formato RGB separado por espacos para alpha Tailwind
- **Google OAuth:** `prompt: 'consent'` + `access_type: 'offline'` obrigatorios
- **Stripe:** apenas cartao para subscriptions (PIX nao suporta recorrencia)
- **Rate limiting:** funcao PostgreSQL atomica com `FOR UPDATE`
- **Git:** repositorio independente em projetos/anja/ (isolado do workspace ccos-ratos)
- **Fontes:** Cormorant Garamond + DM Sans via next/font/google
- **Header title:** usePathname interno no Header (client component) em vez de prop drilling do layout

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01-fundacao | 01-01 | 7min | 2 | 29 |
| 01-fundacao | 01-02 | 12min | 2 | 8 |
| 01-fundacao | 01-03 | 3min | 2 | 4 |
| 01-fundacao | 01-04 | 18min | 2 | 6 |
| 01-fundacao | 01-05 | 25min | 3 | 10 |
| 02-core-ia | 02-02 | — | 2 | 3 |
| 02-core-ia | 02-01 | — | 1 | 1 |
| 02-core-ia | 02-03 | — | 2 | 6 |
| 02-core-ia | 02-04 | — | 2 | 3 |

## Proxima acao

Iniciar Phase 3 — Google Calendar (OAuth2, integrar tools de agenda, listar e criar eventos)

## Stopped at

Completed 02-core-ia/02-04-PLAN.md — Phase 2 COMPLETA — 2026-04-07T21:30:00Z
