# Integrações Críticas — Anja (Secretária Executiva IA)

**Data:** 2026-04-07
**Confiança geral:** HIGH para Google Calendar OAuth2 e Stripe core; MEDIUM para Stripe Brasil (PIX/boleto mudam com frequência); HIGH para Resend
**Nota:** WebSearch e WebFetch indisponíveis nesta sessão. Pesquisa baseada em documentação oficial conhecida até agosto 2025 + padrões consolidados da comunidade. Pontos com confiança MEDIUM ou LOW estão marcados.

---

## 1. Google Calendar API v3 — OAuth2 em Next.js

### Scopes necessários

```
https://www.googleapis.com/auth/calendar           # leitura + escrita (events + calendars)
https://www.googleapis.com/auth/calendar.events    # apenas eventos (mais restrito, preferível)
https://www.googleapis.com/auth/calendar.readonly  # somente leitura
```

Para a Anja (criar, listar, editar, deletar eventos): usar `calendar.events`.
Evitar `calendar` (escopo total) salvo se precisar manipular os próprios calendários do usuário.

### Fluxo OAuth2 completo (Next.js App Router)

#### Passo 1 — Gerar authorization URL

```typescript
// lib/google-oauth.ts
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI // ex: https://app.anja.ai/api/auth/google/callback
  );
}

export function getAuthUrl(userId: string) {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',  // CRÍTICO: garante o refresh_token
    prompt: 'consent',       // CRÍTICO: força re-consent para sempre receber refresh_token
    scope: SCOPES,
    state: userId,           // passar userId para recuperar no callback
  });
}
```

> **Armadilha crítica:** `prompt: 'consent'` é obrigatório. Sem ele, o Google só envia `refresh_token` na primeira autorização. Se o usuário já autorizou antes, você não recebe o refresh_token e a sessão quebra depois de 1 hora.

#### Passo 2 — Route do callback

```typescript
// app/api/auth/google/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOAuthClient } from '@/lib/google-oauth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role para escrever tokens
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const userId = searchParams.get('state');

  if (!code || !userId) {
    return NextResponse.redirect('/error?reason=oauth_missing_params');
  }

  const oauth2Client = getOAuthClient();

  try {
    const { tokens } = await oauth2Client.getToken(code);

    // Persiste tokens no Supabase
    await supabase
      .from('user_integrations')
      .upsert({
        user_id: userId,
        provider: 'google_calendar',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,   // Unix timestamp em ms
        token_type: tokens.token_type,
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id, provider' });

    return NextResponse.redirect('/dashboard?connected=google_calendar');
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect('/error?reason=oauth_failed');
  }
}
```

#### Passo 3 — Schema Supabase para tokens

```sql
create table user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null,               -- 'google_calendar', 'microsoft_outlook', etc.
  access_token text not null,
  refresh_token text,                   -- nullable: Google só envia na primeira vez
  expiry_date bigint,                   -- Unix timestamp em ms (tokens.expiry_date)
  token_type text default 'Bearer',
  scope text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider)
);

-- RLS: somente o próprio usuário lê seus tokens
alter table user_integrations enable row level security;

create policy "users can read own integrations"
  on user_integrations for select
  using (auth.uid() = user_id);

-- Service role bypassa RLS — use SUPABASE_SERVICE_ROLE_KEY no backend
```

> **Segurança:** Nunca exponha access_token nem refresh_token via API pública. Sempre buscar pelo service role key no servidor. Considerar criptografia em repouso (Supabase Vault ou encrypt antes de salvar).

#### Passo 4 — Helper com refresh automático

```typescript
// lib/google-calendar.ts
import { google } from 'googleapis';
import { getOAuthClient } from './google-oauth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getCalendarClient(userId: string) {
  const { data, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .single();

  if (error || !data) throw new Error('Google Calendar não conectado para este usuário');

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: data.expiry_date,
  });

  // googleapis faz refresh automático quando o token está expirado
  // MAS é responsabilidade sua persistir o novo token
  oauth2Client.on('tokens', async (tokens) => {
    // Disparado sempre que o SDK renova o access_token
    const updates: Record<string, unknown> = {
      access_token: tokens.access_token,
      updated_at: new Date().toISOString(),
    };
    if (tokens.refresh_token) {
      updates.refresh_token = tokens.refresh_token;
    }
    if (tokens.expiry_date) {
      updates.expiry_date = tokens.expiry_date;
    }

    await supabase
      .from('user_integrations')
      .update(updates)
      .eq('user_id', userId)
      .eq('provider', 'google_calendar');
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}
```

### Uso nas tools do Claude (agente Anja)

```typescript
// Dentro de um tool handler — ex: create_event
export async function createEvent(userId: string, params: {
  summary: string;
  description?: string;
  start: string; // ISO 8601
  end: string;
  attendees?: string[];
  location?: string;
}) {
  const calendar = await getCalendarClient(userId);

  const event = await calendar.events.insert({
    calendarId: 'primary',
    sendUpdates: 'all', // notifica convidados
    requestBody: {
      summary: params.summary,
      description: params.description,
      location: params.location,
      start: { dateTime: params.start, timeZone: 'America/Sao_Paulo' },
      end:   { dateTime: params.end,   timeZone: 'America/Sao_Paulo' },
      attendees: params.attendees?.map(email => ({ email })),
    },
  });

  return event.data;
}
```

### Token expirado durante tool use do Claude

O SDK `googleapis` renova automaticamente o access_token usando o refresh_token antes de fazer a chamada. O evento `on('tokens', ...)` dispara e você persiste o novo token. Esse ciclo é transparente para o agente.

Cenário de falha: refresh_token foi revogado (usuário removeu o acesso pelo Google). Nesse caso a chamada lança erro `invalid_grant`. Tratar:

```typescript
try {
  return await createEvent(userId, params);
} catch (err: any) {
  if (err.message?.includes('invalid_grant') || err.code === 401) {
    // Deletar os tokens do Supabase e forçar re-autenticação
    await supabase
      .from('user_integrations')
      .delete()
      .eq('user_id', userId)
      .eq('provider', 'google_calendar');

    throw new Error('REAUTH_REQUIRED: Google Calendar desconectado. Peça ao usuário para reconectar.');
  }
  throw err;
}
```

O agente (Anja) deve tratar `REAUTH_REQUIRED` como uma resposta para o usuário, não como erro interno.

### Variáveis de ambiente

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://app.anja.ai/api/auth/google/callback
```

---

## 2. Stripe Subscriptions — Brasil (BRL)

### Configuração de preços em BRL

```typescript
// Criar produto + preço via API (ou fazer no Stripe Dashboard)
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20', // fixar versão da API
});

// Exemplo: criar plano Essencial
const price = await stripe.prices.create({
  currency: 'brl',
  unit_amount: 9700, // R$ 97,00 em centavos
  recurring: { interval: 'month' },
  product_data: {
    name: 'Anja Essencial',
  },
});
```

**IDs de preço recomendados para guardar em env:**

```env
STRIPE_PRICE_ESSENCIAL=price_xxxxx
STRIPE_PRICE_EXECUTIVO=price_xxxxx
STRIPE_PRICE_AGENCIAS=price_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Criar checkout session (App Router)

```typescript
// app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRICE_MAP: Record<string, string> = {
  essencial:  process.env.STRIPE_PRICE_ESSENCIAL!,
  executivo:  process.env.STRIPE_PRICE_EXECUTIVO!,
  agencias:   process.env.STRIPE_PRICE_AGENCIAS!,
};

export async function POST(req: NextRequest) {
  const { userId, plan } = await req.json();

  // Busca ou cria customer no Stripe
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', userId)
    .single();

  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: profile?.email });
    customerId = customer.id;
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: PRICE_MAP[plan], quantity: 1 }],
    payment_method_types: ['card'],  // ver nota sobre PIX abaixo
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: { userId, plan },
    subscription_data: {
      metadata: { userId, plan },
    },
  });

  return NextResponse.json({ url: session.url });
}
```

### Webhook para ativar plano

```typescript
// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// CRÍTICO: desabilitar o body parser do Next.js para este route
export const config = { api: { bodyParser: false } };

// No App Router, ler o body como text:
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 });
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionChange(sub, 'active');
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionChange(sub, 'canceled');
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function handleSubscriptionChange(
  sub: Stripe.Subscription,
  status: 'active' | 'canceled'
) {
  const userId = sub.metadata.userId;
  const plan = sub.metadata.plan;

  if (!userId) {
    console.error('Webhook recebido sem userId no metadata:', sub.id);
    return;
  }

  await supabase
    .from('profiles')
    .update({
      plan: status === 'active' ? plan : 'free',
      subscription_status: status,
      stripe_subscription_id: sub.id,
      plan_expires_at: status === 'active'
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
    })
    .eq('id', userId);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Notificar usuário, mas NÃO bloquear imediatamente
  // Stripe tem grace period configurável (3-7 dias)
  console.log('Pagamento falhou:', invoice.customer);
}
```

### Middleware de feature gating

```typescript
// lib/plans.ts
export type Plan = 'free' | 'essencial' | 'executivo' | 'agencias';

export const PLAN_LIMITS: Record<Plan, {
  agendamentos_mes: number;
  emails_mes: number;
  usuarios: number;
  whatsapp: boolean;
  relatorios: boolean;
  api_access: boolean;
}> = {
  free:      { agendamentos_mes: 10,   emails_mes: 50,   usuarios: 1, whatsapp: false, relatorios: false, api_access: false },
  essencial: { agendamentos_mes: 100,  emails_mes: 500,  usuarios: 1, whatsapp: false, relatorios: true,  api_access: false },
  executivo: { agendamentos_mes: 1000, emails_mes: 2000, usuarios: 3, whatsapp: true,  relatorios: true,  api_access: false },
  agencias:  { agendamentos_mes: -1,   emails_mes: -1,   usuarios: -1, whatsapp: true, relatorios: true,  api_access: true  },
  // -1 = ilimitado
};

export function canDo(plan: Plan, feature: keyof typeof PLAN_LIMITS['free']): boolean {
  const limit = PLAN_LIMITS[plan][feature];
  if (typeof limit === 'boolean') return limit;
  return limit === -1 || limit > 0; // -1 = ilimitado
}

export function isWithinLimit(plan: Plan, feature: 'agendamentos_mes' | 'emails_mes', used: number): boolean {
  const limit = PLAN_LIMITS[plan][feature] as number;
  if (limit === -1) return true;
  return used < limit;
}
```

```typescript
// middleware.ts (exemplo de gate em API route)
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { canDo, Plan } from '@/lib/plans';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verificar plano do usuário antes de endpoints premium
  if (req.nextUrl.pathname.startsWith('/api/calendar')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', session.user.id)
      .single();

    const plan = (profile?.plan ?? 'free') as Plan;

    if (!canDo(plan, 'whatsapp') && req.nextUrl.pathname.startsWith('/api/whatsapp')) {
      return NextResponse.json(
        { error: 'Seu plano não inclui integração com WhatsApp', upgrade_url: '/pricing' },
        { status: 403 }
      );
    }
  }

  return res;
}
```

### PIX e boleto no Stripe — Brasil

**Confiança: MEDIUM** (a disponibilidade de métodos de pagamento no Stripe Brasil muda; verificar painel do Stripe antes de implementar)

**Status atual (até agosto 2025):**

- **PIX**: Stripe suporta PIX no Brasil, mas via modalidade "Payment Links" e Checkout Sessions com `payment_method_types: ['boleto', 'card']`. PIX em subscriptions recorrentes **não é suportado** — funciona apenas para pagamentos únicos (one-time).
- **Boleto**: Disponível para pagamentos únicos. Para assinaturas, o boleto cria uma invoice que o cliente paga manualmente; há atraso de 1-3 dias úteis para confirmação. **Não recomendado para SaaS de acesso imediato** pois você ativaria o plano antes de confirmar o pagamento.
- **Cartão**: Única opção confiável para assinaturas recorrentes automatizadas.

**Recomendação para Anja:**

```typescript
// Para assinaturas, usar apenas cartão:
payment_method_types: ['card'],

// Para upgrade one-time ou add-ons, pode oferecer:
payment_method_types: ['card', 'boleto'],
// NÃO incluir 'pix' em subscriptions
```

**Armadilha do boleto em assinaturas:** Se você incluir boleto como método de pagamento em uma subscription, o Stripe criará invoices com vencimento de 3 dias por padrão. O usuário pode não pagar e a subscription fica em `past_due` — gerando confusão no status do plano.

**Alternativa:** Oferecer boleto apenas para planos anuais pagos adiantado (modo `payment` + `setup_intent` depois para renovação via cartão).

### Idempotência em webhooks

Stripe pode enviar o mesmo evento mais de uma vez. Sempre usar idempotência:

```typescript
// Antes de processar, verificar se já foi processado
const { data: existing } = await supabase
  .from('stripe_events')
  .select('id')
  .eq('event_id', event.id)
  .single();

if (existing) return NextResponse.json({ received: true }); // já processado

// Processar...

// Registrar como processado
await supabase
  .from('stripe_events')
  .insert({ event_id: event.id, processed_at: new Date().toISOString() });
```

---

## 3. Resend — Emails Transacionais

### Setup

```bash
npm install resend
```

```typescript
// lib/email.ts
import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);
```

**Variáveis de ambiente:**

```env
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=Anja <anja@mail.anja.ai>
```

**Boas práticas de domínio:**
- Verificar domínio no painel Resend antes de qualquer envio (DNS SPF + DKIM)
- Usar subdomínio dedicado (`mail.anja.ai`) em vez do domínio raiz
- Nunca usar `@gmail.com` ou `@hotmail.com` como from — vai para spam

### Templates

#### Welcome

```tsx
// emails/welcome.tsx
import { Html, Head, Body, Container, Heading, Text, Button, Hr } from '@react-email/components';

interface WelcomeEmailProps {
  userName: string;
  loginUrl: string;
}

export function WelcomeEmail({ userName, loginUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f9f9f9' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '32px' }}>
          <Heading style={{ fontSize: '24px', color: '#111' }}>
            Bem-vindo à Anja, {userName}
          </Heading>
          <Text style={{ color: '#444', fontSize: '16px' }}>
            Sua secretária executiva com IA está pronta. Comece conectando seu Google Calendar
            para que ela possa gerenciar sua agenda automaticamente.
          </Text>
          <Button
            href={loginUrl}
            style={{
              backgroundColor: '#000',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-block',
              marginTop: '16px',
            }}
          >
            Acessar minha conta
          </Button>
          <Hr style={{ margin: '32px 0', borderColor: '#eee' }} />
          <Text style={{ color: '#999', fontSize: '12px' }}>
            Anja · Secretária Executiva com IA · Cancelar inscrição
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

#### Upgrade de plano

```tsx
// emails/upgrade.tsx
interface UpgradeEmailProps {
  userName: string;
  oldPlan: string;
  newPlan: string;
  dashboardUrl: string;
}

export function UpgradeEmail({ userName, oldPlan, newPlan, dashboardUrl }: UpgradeEmailProps) {
  return (
    <Html>
      <Body style={{ fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '32px' }}>
          <Heading>Plano ativado: {newPlan}</Heading>
          <Text>
            Olá {userName}, seu upgrade de <strong>{oldPlan}</strong> para{' '}
            <strong>{newPlan}</strong> foi confirmado. Todos os recursos já estão disponíveis.
          </Text>
          <Button href={dashboardUrl} style={{ backgroundColor: '#000', color: '#fff', padding: '12px 24px' }}>
            Ver meu painel
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
```

#### Alerta de limite

```tsx
// emails/limit-alert.tsx
interface LimitAlertEmailProps {
  userName: string;
  resource: string;        // ex: "agendamentos"
  used: number;
  limit: number;
  upgradeUrl: string;
}

export function LimitAlertEmail({ userName, resource, used, limit, upgradeUrl }: LimitAlertEmailProps) {
  const pct = Math.round((used / limit) * 100);
  return (
    <Html>
      <Body style={{ fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '32px' }}>
          <Heading style={{ color: '#b45309' }}>Você está em {pct}% do seu limite</Heading>
          <Text>
            {userName}, você usou <strong>{used} de {limit} {resource}</strong> este mês.
            Ao atingir o limite, novos {resource} serão pausados.
          </Text>
          <Button href={upgradeUrl} style={{ backgroundColor: '#b45309', color: '#fff', padding: '12px 24px' }}>
            Fazer upgrade agora
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
```

### Envio com React Email

```typescript
// lib/mailer.ts
import { resend } from './email';
import { WelcomeEmail } from '@/emails/welcome';
import { UpgradeEmail } from '@/emails/upgrade';
import { LimitAlertEmail } from '@/emails/limit-alert';

export async function sendWelcome(to: string, userName: string) {
  return resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: 'Bem-vindo à Anja',
    react: WelcomeEmail({
      userName,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    }),
  });
}

export async function sendUpgrade(to: string, props: {
  userName: string;
  oldPlan: string;
  newPlan: string;
}) {
  return resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: `Seu plano ${props.newPlan} está ativo`,
    react: UpgradeEmail({
      ...props,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    }),
  });
}

export async function sendLimitAlert(to: string, props: {
  userName: string;
  resource: string;
  used: number;
  limit: number;
}) {
  return resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: `Alerta: você usou ${Math.round((props.used / props.limit) * 100)}% do seu limite`,
    react: LimitAlertEmail({
      ...props,
      upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    }),
  });
}
```

**Dependência adicional:**

```bash
npm install @react-email/components
```

---

## Riscos e Armadilhas Consolidados

### Críticos (causam bug silencioso ou perda de dados)

| # | Área | Risco | Mitigação |
|---|------|-------|-----------|
| 1 | Google OAuth | Não usar `prompt: 'consent'` → refresh_token ausente → sessão quebra em 1h | Sempre incluir `prompt: 'consent'` na authUrl |
| 2 | Google OAuth | Não persistir novo token no evento `on('tokens')` → token expira sem renovação | Implementar listener obrigatório com upsert no Supabase |
| 3 | Stripe Webhook | Processar evento duplicado → ativações ou cobranças duplicadas | Tabela `stripe_events` com idempotência por `event.id` |
| 4 | Stripe Webhook | App Router não desabilita body parser → `constructEvent` falha sempre | Usar `req.text()` (App Router) ou `config.api.bodyParser: false` (Pages) |
| 5 | Stripe Brasil | Oferecer PIX em subscriptions → fluxo não funciona | PIX só para pagamentos únicos; cartão para recorrentes |
| 6 | Supabase tokens | Usar anon key para ler/escrever tokens → vulnerabilidade de segurança | Sempre usar service role key no servidor para operações de token |

### Moderados (degradação de UX ou retrabalho)

| # | Área | Risco | Mitigação |
|---|------|-------|-----------|
| 7 | Google OAuth | Token revogado pelo usuário no Google → erro `invalid_grant` não tratado | Capturar 401/invalid_grant, limpar tokens, sinalizar REAUTH_REQUIRED |
| 8 | Stripe | Não mapear `userId` no `metadata` da subscription → webhook não sabe a quem ativar | Sempre passar `metadata: { userId }` em checkout e subscription_data |
| 9 | Stripe | Status `past_due` não tratado → usuário com plano expirado continua acessando | Verificar `subscription_status` além de `plan` no middleware de gating |
| 10 | Resend | Domínio não verificado → emails vão para spam | Verificar DNS antes do primeiro envio; usar subdomínio dedicado |
| 11 | Google Calendar | Não setar `timeZone: 'America/Sao_Paulo'` nos eventos → horário errado para usuários BR | Sempre incluir timezone explícito |

### Menores (dívida técnica ou atrito pontual)

| # | Área | Risco | Mitigação |
|---|------|-------|-----------|
| 12 | Stripe | Versão da API Stripe não fixada → breaking changes silenciosos | Fixar `apiVersion` no construtor Stripe |
| 13 | Resend | Templates sem fallback de texto puro → filtragem por alguns clientes de email | Incluir campo `text` como fallback além de `react` |
| 14 | Stripe | Alertas de limite disparados via webhook de pagamento → lógica acoplada | Separar lógica de alerta de limite em job periódico, não no webhook |

---

## Dependências npm (resumo)

```bash
npm install googleapis stripe resend @react-email/components
npm install -D @types/node
```

---

## Variáveis de ambiente (consolidado)

```env
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://app.anja.ai/api/auth/google/callback

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_ESSENCIAL=price_xxxxx
STRIPE_PRICE_EXECUTIVO=price_xxxxx
STRIPE_PRICE_AGENCIAS=price_xxxxx

# Resend
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=Anja <anja@mail.anja.ai>

# App
NEXT_PUBLIC_APP_URL=https://app.anja.ai
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

*Nota sobre confiança: WebSearch e WebFetch estavam indisponíveis. Todas as afirmações sobre Google Calendar API v3 e Stripe subscriptions são HIGH confidence (APIs estáveis, documentação bem conhecida). Disponibilidade de PIX em subscriptions Stripe é MEDIUM — verificar no painel Stripe antes de implementar pois essa feature evolui com frequência no mercado brasileiro.*
