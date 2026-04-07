# Anja — Requirements

## Contexto

Secretária executiva com IA para empreendedores brasileiros. MVP para uso próprio do fundador (Homero Zanichelli / Stage Mídia). Dogfooding antes do lançamento público.

---

## Requisitos Funcionais

### RF-01 — Autenticação
- RF-01.1: Login com e-mail/senha via Supabase Auth
- RF-01.2: Login com Google OAuth (necessário para acessar Google Calendar)
- RF-01.3: Proteção de rotas via middleware Next.js
- RF-01.4: Sessão persistente com refresh automático (`@supabase/ssr`)

### RF-02 — Chat com Anja (IA)
- RF-02.1: Interface de chat com streaming de resposta (Vercel AI SDK `useChat`)
- RF-02.2: System prompt configurado com personalidade e contexto do usuário
- RF-02.3: Histórico de conversa persistido no Supabase (tabela `messages`)
- RF-02.4: Loading state visual enquanto Anja executa tools
- RF-02.5: Resultado de tool use exibido inline no chat (ex: "Evento criado ✓")
- RF-02.6: Tratamento de erros de tool use sem quebrar o stream
- RF-02.7: Limite de mensagens por plano (rate limiting via Supabase RPC atômica)
- RF-02.8: Janela de contexto gerenciada — manter últimas N mensagens para controlar custo

### RF-03 — Integração Google Calendar
- RF-03.1: OAuth2 flow completo: authorization URL → callback → tokens no Supabase
- RF-03.2: `prompt: 'consent'` + `access_type: 'offline'` obrigatórios no auth URL
- RF-03.3: Refresh automático de access token com persistência no Supabase
- RF-03.4: Tool `create_calendar_event(title, date, time, duration, description, location)`
- RF-03.5: Tool `list_calendar_events(start_date, end_date)`
- RF-03.6: Página `/agenda` com visualização semanal dos eventos
- RF-03.7: Tratamento de erro `AUTH_EXPIRED` com prompt de re-autenticação

### RF-04 — Gestão de Tarefas
- RF-04.1: CRUD completo de tarefas no Supabase
- RF-04.2: Campos: título, nota, prioridade (alta/média/baixa), categoria, status, prazo
- RF-04.3: Status kanban: fazer → fazendo → feito
- RF-04.4: Drag and drop entre colunas (`dnd-kit`)
- RF-04.5: Filtros por categoria e prioridade
- RF-04.6: Tool `create_task(title, priority, category, due_date, note)` via chat
- RF-04.7: Tool `list_tasks(status, priority)` via chat
- RF-04.8: Limite de tarefas por plano (10 no Free, 50 no Essencial, ilimitado nos demais)
- RF-04.9: Atualização otimista na UI (sem wait para banco confirmar)

### RF-05 — Dashboard
- RF-05.1: Visão do dia: próximos eventos do Google Calendar (hoje + amanhã)
- RF-05.2: Fila de tarefas de alta prioridade
- RF-05.3: Stats cards: pendentes, em andamento, atrasadas
- RF-05.4: Data/hora ao vivo
- RF-05.5: Briefing diário via Anja (resumo gerado por IA no primeiro acesso do dia)

### RF-06 — Monetização (Stripe)
- RF-06.1: Checkout Stripe com preços em BRL
- RF-06.2: Webhook `customer.subscription.created/updated/deleted` para ativar/desativar plano
- RF-06.3: `metadata: { userId }` obrigatório na `subscription_data`
- RF-06.4: Middleware de feature gating por plano
- RF-06.5: Página de billing com status do plano e link para portal Stripe
- RF-06.6: Apenas cartão de crédito para subscriptions (PIX não suporta recorrência no Stripe)

### RF-07 — Landing Page
- RF-07.1: Headline, proposta de valor, planos de preço, CTA
- RF-07.2: Otimizada para conversão direta (sem CTA "saiba mais")

### RF-08 — Whitelabel (plano Agências)
- RF-08.1: Campo `custom_name` e `custom_logo_url` na tabela `profiles`
- RF-08.2: Substituição do nome "Anja" e logo quando configurado

---

## Requisitos Não-Funcionais

### RNF-01 — Performance
- Chat deve iniciar streaming em < 500ms
- Tool use (Google Calendar) deve completar em < 8s (Vercel timeout é 10s em planos pagos)
- Dashboard deve carregar em < 2s

### RNF-02 — Mobile
- Layout responsivo desde o início
- Sidebar vira bottom nav em telas < 768px
- `env(safe-area-inset-bottom)` para bottom nav no iOS

### RNF-03 — Segurança
- RLS no Supabase em todas as tabelas (users veem só seus dados)
- Tokens OAuth armazenados criptografados no Supabase
- STRIPE_WEBHOOK_SECRET validado em toda requisição de webhook
- Nunca expor ANTHROPIC_API_KEY ou GOOGLE_CLIENT_SECRET no cliente

### RNF-04 — Identidade Visual
- CSS Variables em formato RGB separado por espaços para suporte a alpha no Tailwind
- Grain texture via SVG `feTurbulence` inline (sem imagem externa)
- Fontes: Cormorant Garamond (display) + DM Sans (body) via `next/font/google`
- Dark premium editorial — sem gradientes purple, sem "AI slop" visual

### RNF-05 — Custo operacional
- Janela de contexto limitada (últimas 20 mensagens por padrão) para controlar custo de tokens
- Rate limiting por plano para proteger margem

---

## Planos e Limites

| Plano | Preço | Mensagens/mês | Tarefas | Features extras |
|---|---|---|---|---|
| Free | Grátis | 30 | 10 | Chat básico |
| Essencial | R$97/mês | 200 | 50 | Google Agenda |
| Executivo | R$197/mês | Ilimitado | Ilimitado | Contexto de clientes, Gmail |
| Agências | R$497/mês | Ilimitado | Ilimitado | Whitelabel, multi-workspace |

---

## Fora de Escopo (MVP)

- Gmail integration (só no plano Executivo — fase posterior)
- Multi-workspace (só no plano Agências — fase posterior)
- Notificações push / e-mail de lembretes
- App mobile nativo
- Integração com WhatsApp
- IA de voz (ElevenLabs)
