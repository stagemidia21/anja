# Anja — Secretária Executiva com IA

## Visão

SaaS B2C para empreendedores brasileiros: uma secretária executiva inteligente que conecta linguagem natural com Google Calendar, gestão de tarefas e dashboard executivo. O nome é uma homenagem à Angela, mãe do fundador Homero Zanichelli (Stage Mídia).

## Problema

Empreendedores PME gastam tempo excessivo em gestão de agenda, triagem de tarefas e organização de prioridades — trabalho que deveria ser de uma EA, não do CEO. Ferramentas existentes são genéricas, não falam português executivo e não integram agenda + tarefas com linguagem natural.

## Solução

Chat com IA (Claude) que entende português BR executivo e age diretamente no Google Calendar e no task manager do usuário. Dashboard que resume o dia, alerta urgências e mantém o foco.

## Usuário-alvo

Empreendedor brasileiro, solopreneur ou PME, que usa Google Calendar e precisa de organização sem overhead de ferramentas complexas. Uso próprio do fundador (Homero) como primeiro cliente — dogfooding.

## Stack Técnica

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Banco:** Supabase (PostgreSQL + Auth + Realtime)
- **IA:** Anthropic Claude API (`claude-sonnet-4-6`)
- **Calendar:** Google Calendar API v3 (OAuth2)
- **Pagamentos:** Stripe (subscriptions)
- **Deploy:** Vercel
- **Email:** Resend
- **Estilo:** Tailwind CSS + CSS Variables

## Identidade Visual

```css
--charcoal:    #1A1814   /* fundo principal */
--char2:       #2A2620   /* fundo cards/sidebar */
--char3:       #3A352F   /* bordas e separadores */
--gold:        #C9A84C   /* accent principal */
--gold-light:  #E8C96A   /* hover states */
--cream:       #F5F0E8   /* texto principal */
--text:        #8A8278   /* texto secundário */
--white:       #FDFAF5   /* texto em fundo escuro */
--danger:      #EF4444
--success:     #22C55E
```

- **Display:** Cormorant Garamond (serif)
- **Body:** DM Sans
- **Mono:** JetBrains Mono
- **Estilo:** Dark premium editorial. Sem gradientes purple. Bordas finas (1px), radius 8-14px.

## Planos de Preço

| Plano | Preço | Mensagens/mês | Features |
|---|---|---|---|
| Free | Grátis | 30 | Chat básico, 10 tarefas |
| Essencial | R$97/mês | 200 | Google Agenda, 50 tarefas |
| Executivo | R$197/mês | Ilimitado | Tudo + contexto clientes, Gmail |
| Agências | R$497/mês | Ilimitado | Whitelabel, multi-workspace |

## Personalidade da Anja

- Eficiente como EA de CEO de alto nível
- Direta e precisa — zero enrolação
- Calorosa mas profissional
- Português BR executivo limpo
- Nunca começa com "Claro!" ou elogios desnecessários

## Estratégia de Lançamento

1. MVP funcional para uso próprio (Homero como único usuário)
2. Beta fechado para rede Stage Mídia / Axis Revenue
3. Lançamento com landing page + Stripe
4. Growth via conteúdo @homero.ads

## Sucesso do MVP

- Homero usa a Anja diariamente para gerenciar agenda e tarefas
- Chat cria e lista eventos no Google Calendar sem erros
- Task manager com kanban funcional
- Dashboard com resumo do dia
