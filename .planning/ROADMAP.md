# Roadmap: Anja

## Overview

Secretária executiva com IA para empreendedores brasileiros. MVP para uso próprio do fundador (Homero Zanichelli / Stage Mídia) antes do lançamento público. Fundação primeiro, IA depois, monetização por último — cada fase entrega valor utilizável.

## Phases

- [x] **Phase 1: Fundação** - Setup Next.js, design system, Supabase auth, layout do dashboard (completed 2026-04-07)
- [ ] **Phase 2: Core IA** - Chat com streaming, tool use, histórico, rate limiting
- [ ] **Phase 3: Google Calendar** - OAuth2 completo, tools de Calendar, página /agenda
- [ ] **Phase 4: Tarefas** - CRUD kanban, drag and drop, tools de tarefas no chat
- [ ] **Phase 5: Dashboard** - Visão executiva do dia, briefing diário gerado por IA
- [ ] **Phase 6: Monetização** - Stripe subscriptions, feature gating, landing page
- [ ] **Phase 7: Telegram** - Bot Telegram como canal nativo — mesmas capacidades do chat web (agenda + tarefas)

## Phase Details

### Phase 1: Fundação
**Goal**: Projeto Next.js 14 rodando com auth funcional, design system configurado e estrutura de banco pronta. O fundador consegue fazer login com Google e ver o layout do dashboard.
**Depends on**: Nothing
**Requirements**: RF-01.1, RF-01.2, RF-01.3, RF-01.4, RNF-02, RNF-03, RNF-04
**Success Criteria** (what must be TRUE):
  1. `npm run dev` inicia sem erros
  2. Login com Google OAuth funciona e redireciona para /dashboard
  3. Middleware protege rotas — /dashboard sem auth redireciona para /login
  4. Design system com CSS Variables RGB configurado no Tailwind
  5. Grain texture visível no background
  6. Fontes Cormorant Garamond + DM Sans carregando via next/font
  7. Sidebar desktop e bottom nav mobile funcionando
  8. Schema SQL aplicado no Supabase com RLS em todas as tabelas
**Plans**: 5 plans

Plans:
- [x] 01-01: Setup do projeto Next.js e dependências
- [x] 01-02: Design system (CSS vars, Tailwind, grain, fontes, componentes base)
- [x] 01-03: Supabase schema SQL + RLS + rate limiting function
- [x] 01-04: Auth pages + middleware
- [x] 01-05: Layout do dashboard (sidebar + bottom nav mobile)

### Phase 2: Core IA
**Goal**: Chat funcional com streaming e tool use. A Anja responde em PT-BR executivo, histórico persiste entre sessões, e rate limiting por plano funciona.
**Depends on**: Phase 1
**Requirements**: RF-02.1, RF-02.2, RF-02.3, RF-02.4, RF-02.5, RF-02.6, RF-02.7, RF-02.8
**Success Criteria** (what must be TRUE):
  1. Chat inicia streaming em < 500ms
  2. Histórico de conversa persiste no Supabase entre sessões
  3. Usuário Free é bloqueado após 30 mensagens no mês
  4. Tool use exibe loading state durante execução
  5. Erros de tool use não quebram o stream — retornam mensagem de erro inline
  6. Janela de contexto limitada a 20 mensagens (controle de custo)
**Plans**: 4 plans

Plans:
- [ ] 02-01: API route /api/chat com Vercel AI SDK streamText + tools
- [ ] 02-02: System prompt da Anja + lib/anthropic.ts
- [ ] 02-03: Componente ChatWindow com streaming e tool invocations UI
- [ ] 02-04: Histórico de mensagens no Supabase + rate limiting

### Phase 3: Google Calendar
**Goal**: Anja acessa e cria eventos no Google Calendar via linguagem natural. OAuth2 completo com refresh automático de tokens.
**Depends on**: Phase 2
**Requirements**: RF-03.1, RF-03.2, RF-03.3, RF-03.4, RF-03.5, RF-03.6, RF-03.7
**Success Criteria** (what must be TRUE):
  1. "Cria reunião amanhã às 15h" cria evento real no Google Calendar do usuário
  2. "O que tenho essa semana?" lista eventos em PT-BR com datas corretas
  3. Tokens OAuth persistidos no Supabase com refresh automático
  4. AUTH_EXPIRED retorna mensagem de re-autenticação no chat sem quebrar o stream
  5. Página /agenda exibe visualização semanal dos eventos
**Plans**: 4 plans

Plans:
- [ ] 03-01: OAuth2 flow completo (auth URL, callback, tokens no Supabase)
- [ ] 03-02: Helpers Google Calendar (createEvent, listEvents, error handling)
- [ ] 03-03: Tool use conectado ao Google Calendar
- [ ] 03-04: Página /agenda com visualização semanal

### Phase 4: Tarefas
**Goal**: Task manager completo com kanban drag-and-drop, CRUD via chat e interface direta.
**Depends on**: Phase 2
**Requirements**: RF-04.1, RF-04.2, RF-04.3, RF-04.4, RF-04.5, RF-04.6, RF-04.7, RF-04.8, RF-04.9
**Success Criteria** (what must be TRUE):
  1. Criar tarefa via chat aparece no kanban sem reload
  2. Drag and drop entre colunas persiste no banco
  3. Atualização otimista funciona — UI atualiza antes do banco confirmar
  4. Filtros por categoria e prioridade funcionam
  5. Limite de tarefas por plano é respeitado (erro exibido ao usuário Free com 10+ tarefas)
**Plans**: 4 plans

Plans:
- [ ] 04-01: API route /api/tasks (CRUD completo)
- [ ] 04-02: Componente TaskBoard com dnd-kit (kanban 3 colunas)
- [ ] 04-03: Filtros, TaskList view e TaskCard
- [ ] 04-04: Tools de tarefas no chat (create_task, list_tasks, update_task)

### Phase 5: Dashboard
**Goal**: Visão executiva do dia com briefing diário gerado por IA. Stats de tarefas e próximos eventos em um layout denso e útil.
**Depends on**: Phase 3, Phase 4
**Requirements**: RF-05.1, RF-05.2, RF-05.3, RF-05.4, RF-05.5
**Success Criteria** (what must be TRUE):
  1. Dashboard carrega em < 2s
  2. Próximos 5 eventos do Google Calendar exibidos corretamente
  3. Briefing diário gerado pela Anja uma vez por dia (cached após primeira geração)
  4. Stats cards refletem estado real das tarefas (pendentes, fazendo, atrasadas)
  5. Relógio ao vivo atualiza sem reload
**Plans**: 3 plans

Plans:
- [ ] 05-01: Componentes StatCard, UpcomingEvents, PriorityQueue
- [ ] 05-02: Briefing diário gerado por IA com cache por dia
- [ ] 05-03: Layout responsivo do dashboard

### Phase 6: Monetização
**Goal**: Stripe integrado, planos funcionais com feature gating, landing page pronta para lançamento público.
**Depends on**: Phase 1
**Requirements**: RF-06.1, RF-06.2, RF-06.3, RF-06.4, RF-06.5, RF-06.6, RF-07.1, RF-07.2
**Success Criteria** (what must be TRUE):
  1. Checkout Stripe completo — usuário paga e plano ativa no Supabase via webhook
  2. Feature gating funciona — usuário Free não acessa Google Calendar
  3. Webhook valida STRIPE_WEBHOOK_SECRET e é idempotente
  4. Página de billing mostra status do plano e link para portal Stripe
  5. Landing page publicada com CTA direto para /signup
**Plans**: 5 plans

Plans:
- [ ] 06-01: Stripe checkout + preços em BRL
- [ ] 06-02: Webhook Stripe com idempotência
- [ ] 06-03: Middleware de feature gating por plano
- [ ] 06-04: Página de billing
- [ ] 06-05: Landing page

### Phase 7: Telegram
**Goal**: Bot Telegram como canal nativo da Anja — mesmas capacidades do chat web (agenda + tarefas) acessíveis via Telegram com a mesma personalidade e tool use.
**Depends on**: Phase 2, Phase 3, Phase 4
**Requirements**: RF-02.1, RF-03.4, RF-03.5, RF-04.1, RF-04.6
**Success Criteria** (what must be TRUE):
  1. Bot responde mensagens no Telegram com a personalidade da Anja
  2. "Cria reunião amanhã às 15h" via Telegram cria evento no Google Calendar
  3. "Minhas tarefas de hoje" via Telegram lista tarefas corretamente
  4. Webhook Telegram configurado e processando mensagens em produção
  5. Usuário vincula conta Anja ao Telegram via comando /conectar
**Plans**: 3 plans

Plans:
- [ ] 07-01: Webhook Telegram + registro do bot + vinculação de conta
- [ ] 07-02: Handler de mensagens com tool use (Calendar + Tasks)
- [ ] 07-03: Comandos especiais (/start, /conectar, /hoje, /tarefas)
