# Stack Research: Next.js 14 + Supabase + Claude API
**Projeto:** Anja — Secretária Executiva com IA
**Data:** 2026-04-07
**Confiança geral:** MEDIUM-HIGH (baseado em training data até ago/2025; ferramentas de busca desabilitadas neste ambiente)

---

## 1. Streaming da Claude API com Tool Use em Next.js App Router

### O padrão que funciona em produção

O SDK oficial da Anthropic (`@anthropic-ai/sdk`) suporta dois modos de streaming: o helper `.stream()` de alto nível e o raw SSE via `.messages.stream()`. Para Next.js App Router com tool use, o padrão recomendado é usar o SDK com `ReadableStream` nativo do Web API — não o `stream` do Node.js.

```typescript
// app/api/chat/route.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const anthropicStream = await client.messages.stream({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        tools: [...],  // tool definitions aqui
        messages,
      });

      for await (const event of anthropicStream) {
        // Passa os eventos SSE direto pro cliente
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### Como o tool use funciona no stream

O stream entrega eventos na seguinte ordem quando uma tool é chamada:

1. `content_block_start` com `type: "tool_use"` — indica que o modelo quer chamar uma tool
2. `content_block_delta` com `type: "input_json_delta"` — fragmentos do JSON de argumentos (stream parcial)
3. `content_block_stop` — JSON completo disponível
4. `message_delta` com `stop_reason: "tool_use"` — modelo parou para aguardar resultado

O cliente precisa acumular os `input_json_delta` para reconstruir o input completo da tool antes de executá-la.

### O loop agentico (agentic loop)

Tool use requer um loop porque o modelo pode chamar múltiplas tools em sequência:

```typescript
async function runAgentLoop(messages: MessageParam[]) {
  while (true) {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      tools,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') break;
    if (response.stop_reason !== 'tool_use') break;

    // Processar todas as tool_use blocks
    const toolResults: ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const result = await executeTool(block.name, block.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
    }

    messages.push({ role: 'user', content: toolResults });
  }

  return messages;
}
```

### Gotchas críticos — Claude API + Streaming + Tool Use

**Gotcha 1: Streaming + tool use não entrega o resultado da tool em stream**
O modelo para de fazer stream quando atinge `stop_reason: "tool_use"`. Você executa a tool server-side, depois reinicia o stream com a nova mensagem. O cliente precisa lidar com múltiplas "rodadas" de stream.

**Gotcha 2: `max_tokens` muito baixo quebra tool calls**
Se `max_tokens` for insuficiente para completar o JSON da tool call, o stream retorna `stop_reason: "max_tokens"` no meio do JSON. Usar mínimo 4096 para respostas com tool use.

**Gotcha 3: Edge Runtime não suporta Node.js streams**
Next.js App Router com `export const runtime = 'edge'` não tem `stream` do Node.js. Usar sempre Web Streams API (`ReadableStream`). O SDK da Anthropic >=0.20 suporta ambos os ambientes.

**Gotcha 4: Timeout do Vercel/Next.js em route handlers**
Streaming longo pode exceder o timeout padrão de 10s na Vercel free tier. Configurar `export const maxDuration = 60` no route handler (requer plano Pro). Alternativa: implementar heartbeat (comentários SSE vazios a cada 5s).

**Gotcha 5: Buffer do navegador corta streams curtos**
Browsers às vezes bufferizam SSE se o payload inicial for muito pequeno. Adicionar um `\n\n` inicial ou um evento de handshake resolve.

**Gotcha 6: Erro de CORS em streaming**
Route handlers do Next.js já lidam com CORS para o mesmo domínio, mas ao chamar de um domínio diferente, headers de CORS precisam ser adicionados manualmente na `Response`.

### Padrão recomendado no cliente (React)

```typescript
// Usar a Vercel AI SDK ao invés de implementar manualmente
import { useChat } from 'ai/react';
// A Vercel AI SDK já lida com tool use, streaming, retry e estado
// Suporta nativamente o formato de eventos da Anthropic
```

A Vercel AI SDK (`ai` package) abstrai todo o gerenciamento de estado de streaming e tool use no lado do cliente. Ela é o padrão de fato para Next.js + Claude. Evitar reimplementar o protocolo SSE manualmente.

---

## 2. Supabase SSR Auth com Next.js 14 App Router

### O pacote correto

Usar `@supabase/ssr` — o pacote antigo `@supabase/auth-helpers-nextjs` está deprecated desde meados de 2024. O novo `@supabase/ssr` é o oficial para App Router.

```bash
npm install @supabase/ssr @supabase/supabase-js
```

### Três clientes, três contextos

O erro mais comum é usar o cliente errado no contexto errado:

| Contexto | Função | Por quê |
|----------|--------|---------|
| Server Component / Route Handler / Server Action | `createServerClient` com `cookies()` | Lê cookies do request |
| Middleware | `createServerClient` com `req/res cookies` | Pode setar cookies na response |
| Client Component | `createBrowserClient` | Usa localStorage/cookies do browser |

```typescript
// utils/supabase/server.ts — Server Components e Route Handlers
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components não podem setar cookies — ignorar
          }
        },
      },
    }
  );
}
```

```typescript
// utils/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // CRÍTICO: chamar getUser() renova o token se necessário
  await supabase.auth.getUser();

  return supabaseResponse;
}
```

```typescript
// middleware.ts — na raiz do projeto
import { updateSession } from '@/utils/supabase/middleware';
import { type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### Gotchas críticos — Supabase SSR Auth

**Gotcha 1: Não chamar `getUser()` no middleware quebra o refresh de token**
O middleware DEVE chamar `supabase.auth.getUser()` em toda request para que o Supabase possa renovar o access token antes que expire. Sem isso, o usuário é deslogado silenciosamente após 1 hora.

**Gotcha 2: `getSession()` não é confiável no servidor**
`getSession()` retorna a sessão do cookie sem validar com o servidor. Usar sempre `getUser()` para verificações de autenticação em Server Components e Route Handlers — especialmente para decisões de autorização.

```typescript
// ERRADO — não verifica com o servidor
const { data: { session } } = await supabase.auth.getSession();

// CORRETO — valida com o servidor Supabase
const { data: { user } } = await supabase.auth.getUser();
```

**Gotcha 3: Cookies da resposta do middleware devem ser passados adiante**
Se o middleware modifica cookies (refresh de token), a `NextResponse` retornada DEVE conter esses cookies. Se você cria uma nova `NextResponse` depois de chamar `updateSession()`, os cookies se perdem.

**Gotcha 4: RLS (Row Level Security) é essencial, não opcional**
Sem RLS, qualquer usuário autenticado pode ler/escrever dados de outros usuários usando o `anon key`. Habilitar RLS em todas as tabelas e criar políticas por `auth.uid()`.

```sql
-- Exemplo de RLS para tabela de mensagens da Anja
CREATE POLICY "Usuário acessa apenas suas mensagens"
ON messages FOR ALL
USING (auth.uid() = user_id);
```

**Gotcha 5: Server Actions precisam do cliente com `cookies()` síncrono (Next.js 15)**
No Next.js 15, `cookies()` passou a ser assíncrono. Se o projeto migrar para 15, o padrão muda para `const cookieStore = await cookies()`. No 14, ainda é síncrono.

**Gotcha 6: Variáveis de ambiente**
`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` ficam expostos no browser — isso é intencional e seguro pois o `anon key` é público. O `service_role key` NUNCA deve ter prefixo `NEXT_PUBLIC_`.

---

## 3. Google Calendar API v3 — OAuth2 com Refresh Token em Next.js

### Onde guardar tokens

**Opção recomendada: Supabase (tabela `oauth_tokens`)**

Não usar `localStorage` (perdido ao trocar de dispositivo), não usar apenas cookies (tamanho limitado, refresh token é longo). Guardar no banco é o padrão correto para SaaS multi-device.

```sql
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token TEXT NOT NULL,
  refresh_token TEXT,  -- pode ser NULL se usuário não concedeu offline access
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- RLS
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário acessa apenas seus tokens"
ON oauth_tokens FOR ALL
USING (auth.uid() = user_id);
```

### Fluxo OAuth2 completo em Next.js

**Passo 1: Iniciar o fluxo (Server Action ou Route Handler)**

```typescript
// app/api/auth/google/route.ts
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI  // ex: https://app.anja.com.br/api/auth/google/callback
);

export async function GET() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',  // CRÍTICO: necessário para receber refresh_token
    prompt: 'consent',       // CRÍTICO: força o Google a enviar refresh_token toda vez
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  });

  return Response.redirect(authUrl);
}
```

**Passo 2: Callback e persistência do token**

```typescript
// app/api/auth/google/callback/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return Response.redirect('/settings?error=google_auth_failed');
  }

  const { tokens } = await oauth2Client.getToken(code);

  // Pegar o usuário autenticado via Supabase
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.redirect('/login');
  }

  // Salvar no banco
  await supabase.from('oauth_tokens').upsert({
    user_id: user.id,
    provider: 'google',
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token || undefined,  // Google só envia na primeira vez
    expires_at: new Date(tokens.expiry_date!).toISOString(),
    scope: tokens.scope,
  }, { onConflict: 'user_id,provider' });

  return Response.redirect('/settings?connected=google');
}
```

**Passo 3: Uso com auto-refresh**

```typescript
// lib/google-calendar.ts
export async function getCalendarClient(userId: string) {
  const supabase = createServiceRoleClient(); // service_role para bypass RLS em server-side

  const { data: tokenRow } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single();

  if (!tokenRow) throw new Error('Google Calendar não conectado');

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    expiry_date: new Date(tokenRow.expires_at).getTime(),
  });

  // Listener para persistir novo access_token após refresh automático
  oauth2Client.on('tokens', async (newTokens) => {
    await supabase
      .from('oauth_tokens')
      .update({
        access_token: newTokens.access_token!,
        expires_at: new Date(newTokens.expiry_date!).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', 'google');
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}
```

### Gotchas críticos — Google Calendar OAuth2

**Gotcha 1: `prompt: 'consent'` é obrigatório para receber `refresh_token`**
O Google só envia `refresh_token` na primeira autorização OU quando `prompt: 'consent'` é usado. Sem o refresh_token, o access_token expira em 1 hora e o usuário precisa reconectar. Em produção com `prompt: 'consent'`, o Google sempre envia o refresh_token.

**Gotcha 2: O `refresh_token` pode ser `null` no callback**
Se o usuário já autorizou antes (sem `prompt: 'consent'`), o Google não reenvia o refresh_token. Na lógica de `upsert`, não sobrescrever um refresh_token existente com `null`.

**Gotcha 3: Não usar o `anon key` do Supabase para acessar tokens de outros usuários**
A tabela `oauth_tokens` tem RLS. Em Server Actions ou Route Handlers que acessam tokens de outro usuário (ex: um processo agendado), usar o `service_role key` com cliente separado.

**Gotcha 4: Google Cloud Console — URLs de redirect precisam ser exatas**
A URL de callback deve ser registrada exatamente no Google Cloud Console (com ou sem trailing slash). Erro `redirect_uri_mismatch` é comum em desenvolvimento quando se troca entre `localhost:3000` e `localhost:3001`.

**Gotcha 5: Escopo de calendar precisa de verificação se o app for público**
Apps com escopo `https://www.googleapis.com/auth/calendar` precisam passar por verificação do Google se tiverem mais de 100 usuários. Para MVP, usar o modo "teste" com usuários adicionados manualmente no Google Cloud Console.

**Gotcha 6: Rate limits da Calendar API**
Calendar API tem limite de 1 milhão de requests/dia por projeto e 500 requests/100 segundos por usuário. Para uma secretária de IA, o padrão de uso pode ser intenso — implementar cache de eventos com revalidação.

---

## 4. Rate Limiting por Usuário com Supabase

### Padrão recomendado: tabela de uso mensal

Para um SaaS com planos, a abordagem mais simples e auditável é uma tabela de contagem no próprio Supabase, sem dependência de Redis ou serviços externos.

```sql
-- Tabela de uso por período
CREATE TABLE usage_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,  -- ex: '2026-04'
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year_month)
);

-- Tabela de planos
CREATE TABLE user_plans (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'starter' | 'pro'
  message_limit INTEGER NOT NULL DEFAULT 50,
  valid_until TIMESTAMPTZ
);

-- Limites por plano
-- free: 50 mensagens/mês
-- starter: 500 mensagens/mês
-- pro: ilimitado (ou 10000)
```

### Função PostgreSQL para verificar e incrementar (atômica)

```sql
CREATE OR REPLACE FUNCTION check_and_increment_usage(
  p_user_id UUID,
  p_year_month TEXT
) RETURNS JSONB AS $$
DECLARE
  v_plan TEXT;
  v_limit INTEGER;
  v_current INTEGER;
BEGIN
  -- Pegar plano do usuário
  SELECT plan, message_limit INTO v_plan, v_limit
  FROM user_plans WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    v_plan := 'free';
    v_limit := 50;
  END IF;

  -- Upsert na contagem mensal
  INSERT INTO usage_monthly (user_id, year_month, message_count)
  VALUES (p_user_id, p_year_month, 0)
  ON CONFLICT (user_id, year_month) DO NOTHING;

  -- Pegar contagem atual com lock
  SELECT message_count INTO v_current
  FROM usage_monthly
  WHERE user_id = p_user_id AND year_month = p_year_month
  FOR UPDATE;

  -- Verificar limite (plano pro = -1 significa sem limite)
  IF v_limit > 0 AND v_current >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current', v_current,
      'limit', v_limit,
      'plan', v_plan
    );
  END IF;

  -- Incrementar
  UPDATE usage_monthly
  SET message_count = message_count + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id AND year_month = p_year_month;

  RETURN jsonb_build_object(
    'allowed', true,
    'current', v_current + 1,
    'limit', v_limit,
    'plan', v_plan
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Uso no Route Handler da Claude API

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const yearMonth = new Date().toISOString().slice(0, 7); // '2026-04'

  // Verificação atômica — uma chamada ao banco
  const { data: usage } = await supabase.rpc('check_and_increment_usage', {
    p_user_id: user.id,
    p_year_month: yearMonth,
  });

  if (!usage.allowed) {
    return Response.json({
      error: 'Limite de mensagens atingido',
      limit: usage.limit,
      current: usage.current,
      plan: usage.plan,
    }, { status: 429 });
  }

  // Continuar com a chamada à Claude API...
}
```

### Gotchas críticos — Rate Limiting

**Gotcha 1: Race condition sem transação ou `FOR UPDATE`**
Sem a função PostgreSQL com `FOR UPDATE`, duas requests simultâneas do mesmo usuário podem ambas passar na verificação e a contagem fica errada. A função com `SECURITY DEFINER` e o lock resolve isso.

**Gotcha 2: Mensagens que falham também foram incrementadas**
Se a Claude API retornar erro após o incremento, o usuário "perdeu" uma mensagem. Usar um rollback explícito ou implementar decremento em caso de falha. Decisão de produto: em geral, incrementar ao receber a resposta, não ao enviar a pergunta.

**Gotcha 3: Streaming conta como uma mensagem, não como N tokens**
Definir claramente o que conta: por mensagem enviada, por request à API, ou por token. Para simplificar no MVP, contar por mensagem de usuário.

**Gotcha 4: Reset do contador no início do mês**
A abordagem com `year_month` como chave natural já resolve: um novo mês cria uma nova linha. Não precisar de cron job para reset.

**Gotcha 5: `SECURITY DEFINER` expõe a função a todos os roles**
A função usa `SECURITY DEFINER` para acessar dados de plano sem RLS. Garantir que ela só pode ser chamada para o próprio usuário (verificar `auth.uid() = p_user_id` dentro da função ou remover o `SECURITY DEFINER` e ajustar o RLS).

---

## 5. Armadilhas Gerais — Next.js + Supabase + Claude API

### Arquitetura e organização

**Problema: Lógica de IA dentro de Server Components**
Server Components não suportam streaming nem estado reativo. Toda interação com a Claude API deve passar por Route Handlers (para streaming) ou Server Actions (para operações one-shot).

**Problema: Misturar `use client` e `use server` desnecessariamente**
Em Next.js App Router, um componente que importa um componente com `use client` se torna implicitamente client-side. Manter a boundary clara: UI interativa = client, acesso a dados = server.

**Problema: Não versionar o schema do banco**
Sem migrações versionadas, o banco de dev e o de prod divergem rapidamente. Usar Supabase CLI com `supabase/migrations/` commitado no git desde o início.

```bash
supabase migration new create_messages_table
supabase db push  # aplica em produção
```

### Performance e custo

**Problema: Enviar histórico completo de mensagens para a Claude a cada request**
Para uma secretária com histórico longo, enviar todas as mensagens anteriores consome tokens e aumenta latência. Implementar janela de contexto (últimas N mensagens) ou sumarização periódica.

**Problema: Não implementar debounce no front-end**
Usuários podem clicar em "enviar" múltiplas vezes antes do stream começar. Desabilitar o botão imediatamente após o primeiro click, reabilitar ao final do stream.

**Problema: Não cachear chamadas à API do Google Calendar**
A Anja provavelmente consultará o calendário em quase todas as interações. Cache de 60s com `unstable_cache` do Next.js ou uma tabela de cache no Supabase reduz drasticamente o número de requests à API do Google.

### Segurança

**Problema: Guardar `ANTHROPIC_API_KEY` em variável com prefixo `NEXT_PUBLIC_`**
Qualquer variável com `NEXT_PUBLIC_` é embutida no bundle do cliente e fica visível publicamente. Chaves de API nunca devem ter esse prefixo.

**Problema: Prompt injection em input do usuário**
Se o sistema monta o prompt concatenando input do usuário com instruções, um usuário mal-intencionado pode tentar sobrescrever o system prompt. Usar o campo `system` separado (não dentro de `messages`) e sanitizar inputs de forma conservadora.

**Problema: Tool results sem validação**
Quando a Anja executa uma tool (ex: criar evento no Google Calendar), o resultado retornado ao modelo deve ser validado para não vazar dados sensíveis ou erros internos com stack traces.

### Deploy e ambiente

**Problema: Supabase local vs produção com URLs diferentes**
OAuth callbacks, webhooks e redirect URLs precisam ser configurados separadamente para cada ambiente. Usar variáveis de ambiente por ambiente (`GOOGLE_REDIRECT_URI`, `NEXT_PUBLIC_APP_URL`) e nunca hardcodar URLs.

**Problema: Middleware do Supabase aumenta latência em cada request**
O middleware chama `supabase.auth.getUser()` que faz uma request ao Supabase Auth em toda navegação. Em produção, isso adiciona ~50-100ms por request. Limitar o matcher do middleware apenas às rotas que realmente precisam de autenticação.

**Problema: Vercel function timeout em tool use com múltiplas calls**
Se a Anja precisar fazer múltiplas chamadas ao Google Calendar em sequência (ex: verificar 3 dias de agenda), o loop agentico pode exceder 10s no plano free da Vercel. Implementar timeout explícito e resposta parcial.

---

## Sumário de Riscos

| Risco | Severidade | Probabilidade | Mitigação |
|-------|-----------|---------------|-----------|
| Streaming + tool use: timeout no Vercel free | Alta | Alta | Plano Pro ou timeout customizado com heartbeat |
| Supabase auth: token não renovado por middleware incorreto | Alta | Média | Seguir padrão oficial `@supabase/ssr` exatamente |
| Google OAuth: refresh_token ausente após re-autorização | Alta | Alta | Usar `prompt: 'consent'` e lógica de não sobrescrever token existente |
| Race condition no rate limiting | Média | Baixa | Função PostgreSQL atômica com `FOR UPDATE` |
| Custo de tokens: histórico longo sem janela de contexto | Alta | Alta | Implementar janela de N mensagens desde o início |
| Prompt injection via input do usuário | Média | Baixa | System prompt separado + sanitização conservadora |
| Schema do banco divergindo entre ambientes | Alta | Alta | Supabase CLI + migrações versionadas desde o dia 1 |
| Google Calendar scope: verificação obrigatória acima de 100 usuários | Alta | Média | Registrar para verificação do Google antes do lançamento público |
| Variáveis de ambiente expostas no cliente | Alta | Baixa | Auditoria regular de variáveis com prefixo NEXT_PUBLIC_ |
| Performance: middleware Supabase em todas as rotas | Média | Alta | Restringir matcher às rotas autenticadas |

---

## Fontes e Confiança

**Confiança: MEDIUM** — WebSearch e WebFetch desabilitados neste ambiente. Este documento é baseado inteiramente em training data (cutoff agosto 2025). Os padrões documentados refletem o estado estável do ecossistema nesse período.

Pontos que devem ser verificados antes de implementar:
- Versão atual do `@supabase/ssr` e mudanças de API se o projeto usar Next.js 15
- Comportamento do `cookies()` assíncrono no Next.js 15 (mudança breaking)
- Versão do SDK Anthropic — o pacote evoluiu bastante em 2024/2025
- Limites atuais da Vercel por plano (maxDuration, etc.)

Referências documentais relevantes (verificar versões atuais):
- https://docs.anthropic.com/en/api/messages-streaming
- https://supabase.com/docs/guides/auth/server-side/nextjs
- https://sdk.vercel.ai/docs (Vercel AI SDK)
- https://developers.google.com/calendar/api/guides/auth
- https://supabase.com/docs/reference/javascript/rpc
