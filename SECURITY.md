# Protocolo de Segurança — Anja

## 1. Autenticação e autorização

| Camada | Mecanismo | Status |
|--------|-----------|--------|
| Páginas protegidas | Middleware Next.js + Supabase session | ✅ |
| Rotas protegidas | `/dashboard`, `/chat`, `/tarefas`, `/agenda`, `/rotinas`, `/configuracoes` | ✅ |
| API `/api/calendar/*` | Supabase `getUser()` — 401 se não autenticado | ✅ |
| API `/api/push/subscribe` | Supabase `getUser()` — 401 se não autenticado | ✅ |
| API `/api/push/send` | Bearer token `INTERNAL_API_SECRET` | ✅ |
| API `/api/chat` | Supabase `getUser()` + rate limit por plano | ✅ |
| RLS Supabase | Todas as tabelas com policies por `user_id` | ✅ |

## 2. Rate limiting

| Endpoint | Limite | Mecanismo |
|----------|--------|-----------|
| `/api/chat` | Por plano (free/pro) | RPC `check_and_increment_usage` — fail-open |
| `/api/auth/signup` | 5 tentativas/IP/hora | In-memory Map (reinicia com o processo) |
| Demais APIs | Sem rate limit explícito | Protegidos por auth Supabase |

> **Pendente**: rate limit global por IP em produção requer Redis ou Upstash.

## 3. Headers de segurança

Configurados via `next.config.mjs` em todas as rotas:

- `X-Frame-Options: DENY` — impede clickjacking
- `X-Content-Type-Options: nosniff` — impede MIME sniffing
- `X-XSS-Protection: 1; mode=block` — proteção XSS legada
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy` — restringe origens de scripts, estilos, conexões

## 4. Validação de input

| Ponto | Validação |
|-------|-----------|
| Chat action JSON | Try/catch + sanitização de `title` (max 200 chars) + whitelist de `priority` |
| Signup | E-mail e senha obrigatórios, senha mínimo 6 chars |
| Calendar create | `title`, `start_datetime`, `end_datetime` obrigatórios |
| Calendar delete/update | `eventId` obrigatório |
| Push subscribe | Valida estrutura completa do objeto `subscription` |

## 5. Variáveis de ambiente sensíveis

Nunca expostas ao cliente (sem prefixo `NEXT_PUBLIC_`):

- `SUPABASE_SERVICE_ROLE_KEY` — acesso admin ao Supabase
- `GOOGLE_SERVICE_ACCOUNT_KEY` — credencial da service account
- `INTERNAL_API_SECRET` — autoriza chamadas internas do notifier
- `VAPID_PRIVATE_KEY` — chave privada Web Push

Expostas ao cliente (seguro — somente chaves públicas):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

## 6. Checklist pré-deploy

- [ ] `npx tsc --noEmit` sem erros
- [ ] `npm run build` sem erros de lint ou tipo
- [ ] Variáveis de ambiente configuradas no servidor de produção
- [ ] RLS habilitado em todas as tabelas no Supabase
- [ ] `INTERNAL_API_SECRET` definido e único (mínimo 32 chars aleatórios)
- [ ] `VAPID_EMAIL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` definidos
- [ ] PM2 rodando com `NODE_ENV=production`

## 7. Checklist pós-deploy

- [ ] Testar login, logout e redirecionamento de rota protegida sem sessão
- [ ] Testar criação de evento pelo chat — confirmar que cria no Calendar correto
- [ ] Verificar headers com `curl -I https://seudominio.com` ou DevTools > Network
- [ ] Confirmar que `/api/push/send` retorna 401 sem o bearer token

## 8. Vulnerabilidades conhecidas / fora do escopo atual

| Item | Risco | Mitigação atual | Próximo passo |
|------|-------|-----------------|---------------|
| Rate limit signup em memória | Reinicia com o processo | Bloqueia rajadas básicas | Upstash Redis em produção |
| CSP `unsafe-inline` em scripts | Médio | Necessário pelo Next.js 14 | Migrar para nonces em Next.js 15 |
| Signup aberto (sem convite) | Baixo | Rate limit por IP | Adicionar flag `SIGNUP_ENABLED=false` |
| execFileSync no chat route | Alto se input não sanitizado | Input via LLM controlado | Revisar e isolar em sandbox |

## 9. Rotina de revisão

- **A cada deploy**: rodar checklist pré e pós-deploy
- **Mensal**: revisar logs do PM2 em busca de padrões anômalos
- **A cada nova feature de API**: exigir auth check como primeiro bloco do handler
