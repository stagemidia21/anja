# Anja — Project State

## Status
`IN_PROGRESS` — Fase 1 em andamento. Plan 01-01 concluido.

## Fase atual
**Phase 1 — Fundacao** | Current Plan: 2 / 5

## Progresso
[##########..........] 20% (1/5 plans concluidos na Fase 1)

## Historico
- 2026-04-07: Projeto inicializado. Spec completo recebido do fundador. Pesquisa de mercado + tecnica concluida. REQUIREMENTS.md e ROADMAP.md criados.
- 2026-04-07: Plan 01-01 concluido. Next.js 14 criado, dependencias instaladas, git proprio inicializado. Commit: 6dc45a0

## Credenciais (guardar em .env.local — NUNCA commitar)
- `TELEGRAM_BOT_TOKEN` — token do BotFather ja gerado (salvar em .env.local)

## Decisoes tecnicas confirmadas
- **Streaming:** Vercel AI SDK `useChat` + `streamText` (nao SDK Anthropic raw)
- **Auth:** `@supabase/ssr` (nao `auth-helpers-nextjs` deprecated)
- **Kanban:** `dnd-kit` (nao react-beautiful-dnd arquivado)
- **CSS vars:** formato RGB separado por espacos para alpha Tailwind
- **Google OAuth:** `prompt: 'consent'` + `access_type: 'offline'` obrigatorios
- **Stripe:** apenas cartao para subscriptions (PIX nao suporta recorrencia)
- **Rate limiting:** funcao PostgreSQL atomica com `FOR UPDATE`
- **Git:** repositorio independente em projetos/anja/ (isolado do workspace ccos-ratos)
- **Fontes:** Cormorant Garamond + DM Sans via next/font/google — configuradas no Plan 02

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01-fundacao | 01-01 | 7min | 2 | 29 |

## Proxima acao
Executar Plan 01-02: Design system (CSS vars, Tailwind, grain, fontes, componentes base)

## Stopped at
Completed 01-fundacao/01-01-PLAN.md — 2026-04-07T19:15:00Z
