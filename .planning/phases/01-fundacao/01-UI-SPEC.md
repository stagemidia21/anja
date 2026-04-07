---
phase: 1
slug: fundacao
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-07
revised: 2026-04-07
---

# Phase 1 — UI Design Contract: Fundação

> Contrato visual e de interação para a Fase 1. Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.
> Fontes: identity locks do prompt do orquestrador, REQUIREMENTS.md (RNF-02, RNF-04), research/ui-chat-architecture.md.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — CSS Variables + Tailwind config customizado |
| Preset | not applicable |
| Component library | none — componentes escritos do zero, sem Radix/Base UI |
| Icon library | lucide-react |
| Font display | Cormorant Garamond (via `next/font/google`, variável `--font-cormorant`) |
| Font body | DM Sans (via `next/font/google`, variável `--font-dm-sans`) |
| Font mono | JetBrains Mono (via `next/font/google`, variável `--font-jetbrains`) |

**Justificativa (fonte: research/ui-chat-architecture.md §4):** O design system premium próprio da Anja tem identidade visual forte demais para absorver overrides de shadcn/Radix sem custo de manutenção. Implementação direta em ~80 linhas é preferível para sidebar/layout. Componentes base (Button, Card, Input, Badge) também escritos do zero seguindo os tokens abaixo.

---

## Tokens de Cor (CSS Variables)

Definir em `app/globals.css` dentro de `@layer base :root {}`. Formato obrigatório: RGB separado por espaços para suporte a alpha modifier no Tailwind (`bg-gold/10`).

```css
:root {
  --charcoal:    26 24 20;      /* #1A1814 — fundo principal */
  --char2:       42 38 32;      /* #2A2620 — fundo cards/sidebar */
  --char3:       58 53 47;      /* #3A352F — bordas e separadores */
  --gold:        201 168 76;    /* #C9A84C — accent principal */
  --gold-light:  232 201 106;   /* #E8C96A — hover states */
  --cream:       245 240 232;   /* #F5F0E8 — texto principal */
  --text-muted:  138 130 120;   /* #8A8278 — texto secundário */
  --off-white:   253 250 245;   /* #FDFAF5 — texto sobre fundo escuro */
  --danger:      239 68 68;     /* #EF4444 — ações destrutivas */
  --success:     34 197 94;     /* #22C55E — confirmações */
}
```

Referência no `tailwind.config.ts`:

```ts
colors: {
  charcoal:    'rgb(var(--charcoal)    / <alpha-value>)',
  'char-2':    'rgb(var(--char2)       / <alpha-value>)',
  'char-3':    'rgb(var(--char3)       / <alpha-value>)',
  gold:        'rgb(var(--gold)        / <alpha-value>)',
  'gold-light':'rgb(var(--gold-light)  / <alpha-value>)',
  cream:       'rgb(var(--cream)       / <alpha-value>)',
  muted:       'rgb(var(--text-muted)  / <alpha-value>)',
  'off-white': 'rgb(var(--off-white)   / <alpha-value>)',
  danger:      'rgb(var(--danger)      / <alpha-value>)',
  success:     'rgb(var(--success)     / <alpha-value>)',
}
```

---

## Spacing Scale

Escala em múltiplos de 4. Tailwind default cobre todos os valores — não é necessário estender o config.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Gap entre ícone e label, padding inline de badges |
| sm | 8px | Padding interno de nav items, gaps compactos |
| md | 16px | Padding padrão de cards, espaçamento entre campos de formulário |
| lg | 24px | Padding de seções, espaçamento entre grupos de nav |
| xl | 32px | Gaps de layout, margens de página em desktop |
| 2xl | 48px | Breaks entre seções maiores |
| 3xl | 64px | Espaçamento de página em telas grandes |

**Exceções:**
- Touch targets de ícone-only no bottom nav: mínimo **44px** de área clicável (via padding vertical + área de toque expandida). Exigência de acessibilidade iOS/Android.
- Bottom nav padding vertical: `max(8px, env(safe-area-inset-bottom))` via utility `.safe-area-pb` — fora da escala padrão por ser responsivo ao dispositivo.
- Sidebar width desktop collapsed: **64px** (w-16). Expanded: **224px** (w-56).

---

## Typography

Fonte body é DM Sans em toda a interface. Cormorant Garamond restrito a logo e títulos de display — nunca em texto funcional abaixo de 20px.

**Pesos permitidos: exatamente 2 — 400 (regular) e 600 (semibold). Nenhum outro peso é permitido nesta fase.**

| Role | Family | Size | Weight | Line Height | Uso |
|------|--------|------|--------|-------------|-----|
| Display | Cormorant Garamond | 28px (text-3xl no mobile, text-4xl lg) | 400 (regular) | 1.2 | Logo "Anja" na sidebar, headings de auth pages |
| Heading | DM Sans | 20px (text-xl) | 600 (semibold) | 1.3 | Título da página no header, seções |
| Body | DM Sans | 16px (text-base) | 400 (regular) | 1.5 | Texto geral, labels de nav, conteúdo de cards |
| Label / Caption | DM Sans | 12px (text-xs) | 400 (regular) | 1.4 | Badge de plano, labels de campo, label do bottom nav |

**Regras fixas (fonte: research/ui-chat-architecture.md §Pitfalls):**
- Cormorant Garamond nunca abaixo de 20px (pesos leves somem em telas low-DPI)
- Peso mínimo para texto funcional: 400
- Tracking: `tracking-wide` apenas para o logo/display em Cormorant. Body sem tracking extra.
- `font-medium` (500) é proibido nesta fase. Usar `font-normal` (400) para texto de interface e `font-semibold` (600) para ênfase.

---

## Color

| Role | Hex | RGB Token | Proporção | Uso |
|------|-----|-----------|-----------|-----|
| Dominant | #1A1814 | `--charcoal` | 60% | Background de todas as páginas, `<body>` |
| Secondary | #2A2620 | `--char2` | 30% | Sidebar, cards, bottom nav, header |
| Accent | #C9A84C | `--gold` | 10% | Ver lista abaixo |
| Accent hover | #E8C96A | `--gold-light` | — | Hover states dos elementos accent |
| Border | #3A352F | `--char3` | — | Bordas de cards, separadores, dividers |
| Text primário | #F5F0E8 | `--cream` | — | Texto principal em todo o app |
| Text secundário | #8A8278 | `--text-muted` | — | Labels, nav items inativos, placeholders |
| Destructive | #EF4444 | `--danger` | — | Ações destrutivas exclusivamente |
| Success | #22C55E | `--success` | — | Confirmações de ação (apenas inline, sem toasts nesta fase) |

**Accent `--gold` reservado para (lista exaustiva — não usar em outros elementos):**
1. Logo "Anja" na sidebar
2. Nav item ativo na sidebar (texto + ícone)
3. Nav item ativo no bottom nav (ícone)
4. Badge de plano no header
5. Botão primário (background `gold/10`, borda `gold/20`, texto `gold`)
6. Focus ring em inputs (`outline-gold/50`)
7. Separador decorativo na auth page (linha horizontal fina)

**Superfícies com `char-3` como borda:** `border border-char-3` — padrão para todos os cards, inputs e separadores da sidebar/header.

---

## Efeitos Globais

### Grain Texture (obrigatório — RNF-04)

Aplicado como pseudo-elemento `::before` na `<body>` via classe `.grain`. Opacidade: **0.035**. Não usar imagem externa — SVG `feTurbulence` inline via `data:image/svg+xml` na propriedade `background-image`.

```css
.grain::before {
  content: '';
  position: fixed;
  inset: -200%;
  width: 400%;
  height: 400%;
  opacity: 0.035;
  pointer-events: none;
  z-index: 9999;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 200px 200px;
}
```

**Restrição:** Não aplicar `transform` ou `filter` no `<body>` — quebra o `position: fixed` do grain.

### Border Radius

- Cards, inputs, badges: `rounded-lg` (8px)
- Botões: `rounded-lg` (8px)
- Nav items (sidebar): `rounded-lg` (8px)
- Avatar: `rounded-full`
- Máximo permitido: `rounded-xl` (12px) para modal/overlay — nunca `rounded-2xl` ou superior nesta fase

### Sombras

Sombras suaves apenas. Não usar `shadow-xl` ou `drop-shadow` pesados.
- Cards padrão: sem sombra (borda `border-char-3` é suficiente)
- Sidebar/header: sem sombra (separação por borda)
- Overlay mobile: `bg-charcoal/80` com backdrop

---

## Componentes — Especificação da Fase 1

### 1. AppShell (layout raiz)

Layout: `flex` horizontal. Sidebar esquerda em desktop, conteúdo principal à direita.

```
Desktop (≥768px):
┌──────────┬─────────────────────────────┐
│ Sidebar  │ Header                      │
│ (w-16 /  ├─────────────────────────────┤
│  w-56)   │ Page content                │
│          │                             │
└──────────┴─────────────────────────────┘

Mobile (<768px):
┌─────────────────────────────┐
│ Header (sem sidebar)        │
├─────────────────────────────┤
│ Page content                │
│                             │
├─────────────────────────────┤
│ Bottom nav (fixed)          │
└─────────────────────────────┘
```

- `<main>`: `pb-16 md:pb-0` — espaço para o bottom nav no mobile
- Fundo: `bg-charcoal`

---

### 2. Sidebar (desktop)

- Background: `bg-char-2`
- Borda direita: `border-r border-char-3`
- Position: `sticky top-0 h-screen` (acompanha scroll)
- Width: `w-16` (≥768px, ícones apenas) → `w-56` (≥1024px, ícone + label)
- Oculta em mobile: `hidden md:flex`

**Seções internas:**

**Logo / Topo:**
- Padding: `px-4 py-6`
- Separador inferior: `border-b border-char-3`
- Texto "Anja": `font-display text-gold text-xl font-normal hidden lg:block`
- Versão colapsada: `font-display text-gold text-xl lg:hidden` (apenas "A")

**Nav items:**
- Container: `flex-1 py-4 space-y-1 px-2`
- Item inativo: `text-muted hover:text-cream hover:bg-char-3`
- Item ativo: `bg-gold/10 text-gold border border-gold/20`
- Layout: `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150`
- Ícone: `w-5 h-5 shrink-0` (lucide-react)
- Label: `text-sm font-normal hidden lg:block`
- **Acessibilidade (sidebar colapsada):** quando a sidebar está no modo collapsed (w-16, label oculta), cada `SidebarItem` deve incluir `aria-label={item.label}` no elemento raiz clicável, para que leitores de tela anunciem o destino corretamente.

**Nav items desta fase (em ordem):**
1. Dashboard — `LayoutDashboard` icon — `/dashboard`
2. Chat (Anja) — `MessageSquare` icon — `/chat`
3. Tarefas — `CheckSquare` icon — `/tarefas`
4. Agenda — `Calendar` icon — `/agenda`

**User info (base da sidebar):**
- Padding: `px-3 py-4`
- Separador superior: `border-t border-char-3`
- Avatar: `w-8 h-8 rounded-full bg-gold/20` com inicial do nome em `text-gold text-sm font-normal`
- Nome: `text-sm font-normal text-cream hidden lg:block` (truncado com `truncate`)
- Badge de plano: `text-[10px] font-normal text-gold bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded` — valor: Free / Essencial / Executivo / Agências
- Toda a seção oculta em desktop collapsed (lg:hidden para textos)

---

### 3. Bottom Nav (mobile)

- Position: `fixed bottom-0 left-0 right-0 z-50`
- Background: `bg-char-2`
- Borda superior: `border-t border-char-3`
- Layout: `flex items-center justify-around px-2`
- Padding vertical: `.safe-area-pb` (utilidade customizada — `max(8px, env(safe-area-inset-bottom))`)
- Visível apenas: `md:hidden`

**Cada item:**
- Layout: `flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg`
- Ícone: `w-5 h-5` (lucide-react, mesmo conjunto da sidebar)
- Label: `text-[10px] font-normal` (DM Sans, 10px)
- Inativo: `text-muted`
- Ativo: `text-gold`
- Área de toque mínima: 44px — garantida via `px-3 py-1.5` + ícone + label totalizando ≥44px de altura

**4 itens (sem Agenda nesta fase no mobile — aparece só após Fase 3):**
1. Dashboard — `LayoutDashboard`
2. Chat — `MessageSquare`
3. Tarefas — `CheckSquare`
4. Agenda — `Calendar`

---

### 4. Header (página)

- Background: `bg-char-2`
- Borda inferior: `border-b border-char-3`
- Layout: `flex items-center justify-between px-4 md:px-6 py-3`
- Height: `h-14` (56px fixo)
- Position: `sticky top-0 z-40`

**Esquerda:** Título da página
- Fonte: DM Sans, 20px, weight 600
- Cor: `text-cream`
- Classe: `text-xl font-semibold`

**Direita:** User info compacta
- Avatar: `w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center`
- Inicial: `text-sm font-normal text-gold`
- Badge de plano: `text-[10px] font-normal text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded` — visível apenas em ≥768px (`hidden md:inline-flex`)
- Gap entre elementos: `gap-3`

---

### 5. Auth Pages (/login e /signup)

Layout: tela cheia `min-h-screen bg-charcoal grain flex items-center justify-center`.

**Card central:**
- Width: `w-full max-w-md`
- Background: `bg-char-2`
- Borda: `border border-char-3`
- Border radius: `rounded-xl`
- Padding: `p-8`
- Sombra: nenhuma

**Estrutura interna (de cima para baixo):**

1. **Logo/heading:**
   - "Anja" em Cormorant Garamond, 36px (`text-4xl`), weight 400, cor `text-gold`
   - Tagline: "Sua secretária executiva com IA" — DM Sans, 14px, cor `text-muted`, `mt-1`
   - Separador: linha horizontal `border-t border-gold/20 my-6`

2. **Botão Google OAuth (CTA principal desta fase):**
   - Label: **"Entrar com Google"**
   - Estilo: `w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-gold/10 border border-gold/20 text-cream text-sm font-normal hover:bg-gold/20 transition-colors duration-150`
   - Ícone: SVG do Google (inline, não lucide-react)
   - Estado loading: spinner 3 dots animados (ver spinner abaixo) + label "Entrando..."

3. **Divider (para signup com e-mail/senha):**
   - `relative flex items-center gap-3 my-6`
   - Linhas: `flex-1 border-t border-char-3`
   - Texto: "ou" — `text-xs text-muted`

4. **Campos (e-mail/senha — /signup e /login):**
   - Input: ver especificação de Input abaixo
   - Label: `text-xs font-normal text-muted mb-1.5 block`
   - Gap entre campos: `space-y-4`

5. **CTA secundário (e-mail/senha):**
   - /login: botão "**Entrar na conta**" (primary)
   - /signup: botão "**Criar conta**" (primary)

6. **Link de alternância:**
   - /login: "Não tem conta? **Criar conta**"
   - /signup: "Já tem conta? **Entrar na conta**"
   - Estilo: `text-sm text-muted` com `text-gold hover:text-gold-light underline underline-offset-2` no link

---

### 6. Componentes Base

#### Button

**3 variantes:**

| Variante | Background | Borda | Texto | Hover |
|----------|-----------|-------|-------|-------|
| primary | `bg-gold/10` | `border border-gold/20` | `text-gold` | `hover:bg-gold/20` |
| secondary | `bg-char-3` | `border border-char-3` | `text-cream` | `hover:bg-char-3/80` |
| ghost | transparent | nenhuma | `text-muted` | `hover:text-cream hover:bg-char-3` |

**Dimensões padrão (md):**
- Padding: `px-4 py-2.5`
- Font: `text-sm font-normal`
- Border radius: `rounded-lg`
- Transition: `transition-colors duration-150`
- Disabled: `opacity-40 cursor-not-allowed`

**Estado loading (qualquer variante):**
- Substituir label por spinner 3 dots + label com opacidade reduzida
- Não usar spinner circular — 3 dots bounce animados em `--gold` são o padrão visual

#### Input

- Background: `bg-charcoal` (mais escuro que o card para criar profundidade)
- Borda: `border border-char-3 focus:border-gold/50`
- Border radius: `rounded-lg`
- Padding: `px-3 py-2.5`
- Font: DM Sans, `text-sm` (14px), `text-cream`
- Placeholder: `placeholder:text-muted`
- Focus: `outline-none focus:ring-2 focus:ring-gold/20`
- Width: `w-full` por padrão
- Estado de erro: `border-danger/60 focus:border-danger focus:ring-danger/20`

#### Card

- Background: `bg-char-2`
- Borda: `border border-char-3`
- Border radius: `rounded-lg`
- Padding padrão: `p-4` (ajustável por uso)
- Sem sombra

#### Badge

**3 variantes para planos:**

| Plano | Classes |
|-------|---------|
| Free | `text-muted bg-char-3 border border-char-3` |
| Essencial | `text-gold bg-gold/10 border border-gold/20` |
| Executivo | `text-gold bg-gold/10 border border-gold/20` |
| Agências | `text-gold-light bg-gold/15 border border-gold/30` |

**Dimensões:** `text-[10px] font-normal px-2 py-0.5 rounded`

**Badge genérico (status, etc):**
- Padrão: `text-xs font-normal px-2 py-0.5 rounded`

#### Spinner (3 dots bounce)

```
<span className="flex gap-1 items-center">
  {[0, 1, 2].map((i) => (
    <span
      key={i}
      className="w-1 h-1 rounded-full bg-gold animate-bounce"
      style={{ animationDelay: `${i * 0.15}s` }}
    />
  ))}
</span>
```

Usado em: botões em loading, estado de carregamento de ferramentas (Fase 2+).

---

## Copywriting Contract

| Elemento | Cópia |
|----------|-------|
| CTA principal da fase (Google OAuth) | **"Entrar com Google"** |
| CTA botão /login (e-mail) | **"Entrar na conta"** |
| CTA botão /signup | **"Criar conta"** |
| Logo tagline | **"Sua secretária executiva com IA"** |
| Estado loading do Google OAuth | **"Entrando..."** |
| Empty state — dashboard (nenhuma tarefa, nenhum evento) | **"Nenhuma tarefa por enquanto"** / "Use o chat para pedir à Anja que crie suas primeiras tarefas." |
| Erro de auth — credenciais inválidas | **"E-mail ou senha incorretos."** "Verifique seus dados e tente novamente." |
| Erro de auth — Google OAuth falhou | **"Não foi possível conectar ao Google."** "Tente novamente ou use e-mail e senha." |
| Erro genérico de rede | **"Algo deu errado."** "Aguarde alguns segundos e tente novamente." |
| Ações destrutivas nesta fase | Nenhuma — Fase 1 não contém exclusões ou operações irreversíveis |

**Tom:** Direto, sem rodeios. Nunca "Oops!" nem emojis em mensagens de erro. Português BR com acentuação correta.

---

## Responsividade — Breakpoints

| Breakpoint | Valor | Comportamento |
|------------|-------|---------------|
| mobile | < 768px | Sem sidebar. Bottom nav fixo. Header sem badge de plano. |
| tablet/desktop | ≥ 768px | Sidebar com ícones apenas (w-16). Bottom nav oculto. |
| large desktop | ≥ 1024px | Sidebar expandida (w-56) com ícones + labels. |

`env(safe-area-inset-bottom)` obrigatório no bottom nav para iPhone com home indicator (RNF-02).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | nenhum — componentes escritos do zero | not applicable |
| Terceiros | nenhum | not applicable |

**Decisão:** sem shadcn nesta fase. Todos os componentes são implementações diretas em Tailwind + CSS Variables. Elimina risco de registry de terceiros e dependências desnecessárias.

---

## Notas de Implementação para o Executor

1. **CSS Variables antes de qualquer componente.** O `globals.css` com os tokens RGB deve ser o primeiro arquivo a existir. Sem ele, todas as classes Tailwind de cor falham silenciosamente.

2. **Ordem de variáveis de fonte no `<html>`.** As três fontes (Cormorant, DM Sans, JetBrains) devem ter seus `variable` concatenados no `<html>` antes de qualquer uso das classes `font-display`, `font-body`, `font-mono`.

3. **`transform` proibido no `<body>`.** O grain usa `position: fixed` — qualquer `transform` ou `will-change` no `<body>` cria um novo stacking context e prende o grain.

4. **`pb-16 md:pb-0` no `<main>`.** Sem isso, o último item da página fica coberto pelo bottom nav no mobile.

5. **Weights do Cormorant carregados:** 300, 400, 500, 600, 700 + italic. Apenas 400 e 600 usados nesta fase — os demais carregam para fases futuras.

6. **`font-medium` proibido.** Nenhuma classe `font-medium` deve aparecer no código desta fase. Usar `font-normal` (400) ou `font-semibold` (600) exclusivamente.

7. **`aria-label` obrigatório em SidebarItem colapsado.** Quando a sidebar está em modo collapsed (w-16), o texto do label está oculto via `hidden lg:block`. O elemento clicável deve carregar `aria-label={item.label}` para acessibilidade de leitores de tela.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
