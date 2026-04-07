# Anja — Project State

## Status
`PLANNING` — roadmap pronto, pronto para iniciar Fase 1

## Fase atual
Nenhuma em andamento. Próxima: Fase 1 — Fundação.

## Histórico
- 2026-04-07: Projeto inicializado. Spec completo recebido do fundador. Pesquisa de mercado + técnica concluída. REQUIREMENTS.md e ROADMAP.md criados.

## Credenciais (guardar em .env.local — NUNCA commitar)
- `TELEGRAM_BOT_TOKEN` — token do BotFather já gerado (salvar em .env.local)

## Decisões técnicas confirmadas
- **Streaming:** Vercel AI SDK `useChat` + `streamText` (não SDK Anthropic raw)
- **Auth:** `@supabase/ssr` (não `auth-helpers-nextjs` deprecated)
- **Kanban:** `dnd-kit` (não react-beautiful-dnd arquivado)
- **CSS vars:** formato RGB separado por espaços para alpha Tailwind
- **Google OAuth:** `prompt: 'consent'` + `access_type: 'offline'` obrigatórios
- **Stripe:** apenas cartão para subscriptions (PIX não suporta recorrência)
- **Rate limiting:** função PostgreSQL atômica com `FOR UPDATE`

## Próxima ação
`/gsd-plan-phase 1` — planejar e executar Fase 1 (Fundação)
