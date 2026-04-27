# Anja Dashboard — UI Review

**Audited:** 2026-04-08
**Baseline:** Abstract 6-pillar standards + project design system tokens (charcoal / gold / cream stack)
**Screenshots:** Not captured — no dev server running at localhost:3000 or :5173 (code-only audit)
**Audit method:** Full source review — 16 files examined

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | PT-BR throughout, purposeful CTAs; one misplaced emoji, ambiguous "..." save state |
| 2. Visuals | 2/4 | `h-13` is invalid Tailwind — header has no enforced height, breaking full-height chat/agenda; inconsistent card header treatment |
| 3. Color | 2/4 | Gold applied to every icon everywhere (115 instances) — accent signal is lost; 60/30/10 balance inverted in dense pages |
| 4. Typography | 3/4 | 7 size levels with dual micro-text tier (text-[10px] + text-[8px]); card section labels use 4 different style patterns |
| 5. Spacing | 3/4 | Card padding alternates p-4/p-5 without a rule; page max-widths create jarring content-column jumps between pages |
| 6. Experience Design | 3/4 | Loading/empty/error states present; Configurações unreachable on mobile; rotinas delete has no confirmation |

**Overall: 16/24**

---

## Top 3 Priority Fixes

1. **`h-13` is not a valid Tailwind class in `header.tsx:23`** — Tailwind's scale jumps from h-12 (48px) to h-14 (56px). `h-13` is silently ignored. Both `chat/page.tsx:25` and `agenda/page.tsx:89` use `h-[calc(100vh-3.5rem)]` (3.5rem = 56px = h-14) to subtract the header height — but if the actual rendered header is not 56px, these full-height panels overflow or leave a dead gap. This is the most likely cause of "perdeu o design." Fix: replace `h-13 py-0` with `h-14` in `header.tsx:23` and verify chat/agenda panels align correctly.

2. **Gold is used on every icon on every card in every page — the accent is invisible** — 115 instances of `text-gold`/`bg-gold`/`border-gold` across 13 audited files. In dense views like Tarefas and Rotinas, every card header icon, every inline timestamp, every section divider, every CTA, every nav item, and every progress bar is gold. The color stops functioning as a priority signal. Fix: strip `text-gold` from secondary card-header icons (Clock, CheckSquare, Calendar inside card headers in dashboard, configuracoes, rotinas) and replace with `text-muted`. Reserve gold for: primary CTA buttons, active nav state, Anja avatar, alert callouts (overdue, high priority), and progress indicators.

3. **Configurações is unreachable on mobile** — `bottom-nav.tsx` has 5 slots: Dashboard, Chat, Tarefas, Agenda, Rotinas. Configurações (the 5th sidebar item on desktop) has no mobile navigation path. A first-time mobile user cannot configure their Telegram ID, work hours, or account settings without knowing to type `/configuracoes` directly. Fix: swap Rotinas out of the bottom-nav's 5th slot and into a secondary position, or link to Configurações from the user avatar in `header.tsx` (no extra nav slot needed).

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Strengths:**
- All interface text is in PT-BR with correct accents and accentuation throughout
- Empty states are contextual: "Nenhum evento hoje. Pedir à Anja pra agendar →" (`dashboard/page.tsx:165-169`), "Nenhuma tarefa pendente." (`dashboard/page.tsx:203`), descriptive routine empty with examples (`rotinas/page.tsx:363-365`)
- CTAs are action-specific: "Falar com Anja", "Nova tarefa", "Nova rotina", "Adicionar", "Salvar" — none use generic English defaults
- Loading labels show progress: "Salvando...", "Adicionando..." (`tarefas/page.tsx:476`, `rotinas/page.tsx:342`)
- Error message in chat is direct: "Algo deu errado. Tenta novamente." (`chat-window.tsx:125`)

**Issues:**
- `dashboard/page.tsx:203`: "Nenhuma tarefa pendente. 🎉" — the emoji is the only one in the entire codebase. It reads as inconsistent with the premium dark aesthetic of the rest of the app.
- `rotinas/page.tsx:32` (SaveBtn): shows `'...'` while saving rather than `'Salvando...'`. The ellipsis is ambiguous and communicates less than the tarefas equivalent.
- `chat-window.tsx:99`: "Sua secretária executiva com IA. Posso criar eventos, gerenciar tarefas e muito mais." — "muito mais" is generic; specificity here would reinforce the Anja persona (e.g., "gerenciar rotinas e planejar seu dia").

---

### Pillar 2: Visuals (2/4)

**Critical: `h-13` is an invalid class**
`header.tsx:23` uses `h-13 py-0`. Tailwind's default spacing scale does not include 13. The header renders at its content height (approximately 48px from internal padding), not 56px. Both `chat/page.tsx:25` and `agenda/page.tsx:89` offset their full-height containers by exactly `3.5rem` (56px = h-14). The mismatch between the rendered header height and the assumed subtracted height is a geometry bug causing overflow or gap in the two most visually distinctive pages of the app.

**Card header hierarchy has no consistent treatment**
Four different patterns for card section labels exist across the same app:
- `text-xs font-semibold text-cream` — "Agenda de hoje", "Prioridade alta" (`dashboard/page.tsx:157, 195`)
- `text-sm font-semibold text-cream` — "Horário de trabalho", "Todas as rotinas", "Conta", "Telegram" (`rotinas/page.tsx:285, 355`, `configuracoes/page.tsx:69, 92`)
- `text-[10px] text-muted uppercase tracking-wider` — "Ações rápidas", "Gestão" (`dashboard/page.tsx:266`, `sidebar.tsx:66`)
- `text-xs font-semibold text-muted uppercase tracking-wide` — kanban column headers (`tarefas/page.tsx:492`)

These four patterns all serve the same semantic role. The visual inconsistency makes the app feel assembled from parts rather than designed as a system.

**Strengths:**
- Icon set is 100% Lucide React with no mixing of libraries
- The "A" lettermark in Cormorant is elegant and consistently placed in Anja's avatar contexts
- Chat empty state (Anja logo + serif greeting + action grid) is the best-composed screen in the app
- Grain texture at 2.5% opacity is well-calibrated — present on high-DPI without noise

---

### Pillar 3: Color (2/4)

**Gold overuse eliminates the accent's signaling power**

Total `text-gold` / `bg-gold` / `border-gold` instances across all audited TSX files: **115**

Gold currently appears on:
- Every icon inside every card header (Clock, CheckSquare, Calendar, User, MessageCircle) across all pages
- Scheduled task timestamps inline in task rows
- Progress bars (routines completion, analytics)
- The current-time indicator line in agenda
- Today's date circle in agenda
- Session list hover highlights in chat
- "media" priority dot indicator

This leaves danger and cream doing more visual work than gold in many views. The 60/30/10 split (charcoal surfaces / cream text / gold accent) is functionally inverted on Rotinas and Tarefas pages where gold appears more than muted text.

**No hardcoded hex colors found in TSX files** — the token system is correctly followed everywhere. Every color reference routes through design tokens.

**danger and success are appropriately contained:** danger appears on overdue tasks, delete confirmation, logout hover, and error borders. success appears only on the Google Calendar connection indicator. Both are proportionate.

**Specific fix targets:**
- `dashboard/page.tsx:44-45`: `icon={accent ? 'text-gold' : 'text-gold'}` — both branches of the conditional produce the same result. The non-accent icon branch should be `text-muted`.
- `configuracoes/page.tsx:68, 91` and `rotinas/page.tsx:284, 354`: Section header icons (User, MessageCircle, Clock, Calendar) should be `text-muted`, not `text-gold`.

---

### Pillar 4: Typography (3/4)

**Sizes found across audited TSX files:**

| Class | Instances | Note |
|-------|-----------|------|
| text-3xl | 2 | Auth logo, chat empty state |
| text-2xl | 2 | Dashboard stat values, chat greeting |
| text-xl | 2 | Dashboard page h1, sidebar logo |
| text-lg | 2 | Chat markdown h1 |
| text-base | 5 | Page h1 headings (Agenda, Tarefas, Rotinas, Configurações, Auth) |
| text-sm | 59 | Primary body text |
| text-xs | 92 | Secondary labels, card content |
| text-[10px] | 16 | Micro-labels, nav labels, section headers |
| text-[8px] | 1 | Diamond bullet in chat markdown |

**Issues:**
- `message-bubble.tsx:53`: `text-[8px]` for the `◆` bullet marker. At 8px this renders inconsistently across pixel densities and is below legible threshold. Replace with a CSS pseudo-element (`::before { content: '•'; color: gold; font-size: 8px }`) or a standard 4px SVG dot.
- Dashboard page h1 is `text-xl` (`dashboard/page.tsx:104`) while all other pages use `text-base` for their h1. If all pages are equal in hierarchy, normalize to `text-lg font-semibold` everywhere. If Dashboard is intentionally the "home" — that's a valid product decision, but the other page headings should be styled as intentionally quieter to make the contrast purposeful, not accidental.
- Four different card section label styles (see Visuals pillar) — this is also a typography problem. Define one pattern and use it everywhere: `text-xs font-medium text-muted uppercase tracking-wider` is already the cleanest treatment in the codebase ("Ações rápidas", "Gestão") — expand it to all card section headings.
- `font-display` (Cormorant Garamond) appears only 9 times total: auth, sidebar logo, chat avatar, chat welcome screen, and markdown h1 renderer. As the premium brand differentiator, it is underused. Section headings in rotinas and configuracoes ("Horário de trabalho", "Todas as rotinas") in `text-sm font-semibold` could use `font-display font-light text-base` to inject brand character without redesigning the layout.

**Weights distribution:** font-semibold (33), font-medium (14), font-normal (7), font-light (3) — well balanced.

---

### Pillar 5: Spacing (3/4)

**Card padding inconsistency — no declared rule between p-4 and p-5:**

| Pattern | Pages using it |
|---------|---------------|
| `p-4` | Dashboard all cards (`dashboard/page.tsx:43, 153, 191, 232, 265`) |
| `p-5` | Rotinas work settings, "Todas as rotinas" (`rotinas/page.tsx:281, 352`), all Configurações cards (`configuracoes/page.tsx:66, 89, 107`) |
| `p-3` | Tarefas task cards (correct — compact kanban) |

The p-4/p-5 split appears to track page context (dashboard = dense overview, configuracoes/rotinas = form-focused settings) which is a defensible intent — but it is never stated and is therefore invisible to contributors. A comment or design token would lock it in.

**Page max-widths cause navigation width jumps:**

| Page | Max-width | Computed |
|------|-----------|----------|
| Dashboard | max-w-4xl | 896px |
| Tarefas | max-w-5xl | 1024px |
| Rotinas | max-w-2xl | 672px |
| Configurações | max-w-2xl | 672px |

Navigating from Rotinas to Dashboard shifts the content column right by 224px. Navigating from Dashboard to Tarefas shifts it right again by 128px. The content feels like it is floating in different places depending on which page is active. Standardize: `max-w-3xl` (768px) for settings/narrow pages, `max-w-5xl` for wide-data pages.

**Rotinas uses `space-y-6` (`rotinas/page.tsx:224`) while Dashboard and Configurações use `space-y-5`** — a one-step loose-rhythm anomaly on that page.

**Arbitrary values in use** — all functional, none decorative:
- `min-h-[100px]` (tarefas/page.tsx:497) — kanban column min-height, acceptable
- `min-w-[600px]` (agenda/page.tsx:106) — horizontal scroll container for week view, acceptable
- `text-[10px]` in 16 places — these should become a `text-tiny` custom token in tailwind.config

---

### Pillar 6: Experience Design (3/4)

**Loading states — present and well-implemented:**
- Tarefas: 3-column skeleton with shimmer animation (`tarefas/page.tsx:78-94`)
- Rotinas: skeleton rows while loading (`rotinas/page.tsx:359-363`)
- Chat: bouncing dots indicator while switching sessions (`chat-layout.tsx:175-181`)
- Save buttons: "Salvando..." / "Adicionando..." text states
- Global `.skeleton` shimmer class defined in `globals.css:61-69`

**Error states — covered in chat, absent in data pages:**
- Chat: "Algo deu errado. Tenta novamente." on `status === 'error'` (`chat-window.tsx:124`)
- Dashboard server component catches calendar API failure silently (returns `[]`) — user sees "dia livre" when the calendar API is broken, with no indication something went wrong
- Tarefas/rotinas: Supabase failures return empty arrays silently — user sees "Nenhuma tarefa" with no distinction between empty and error

**Empty states — all covered:**
- Dashboard agenda empty: "Nenhum evento hoje." + CTA to chat (`dashboard/page.tsx:163-169`)
- Dashboard tasks empty: "Nenhuma tarefa pendente. 🎉" (`dashboard/page.tsx:203`)
- Tarefas kanban columns: dashed border placeholder with "Nenhuma tarefa" (`tarefas/page.tsx:502-504`)
- Rotinas: descriptive text with examples (`rotinas/page.tsx:363-365`)

**Destructive action protection — inconsistent:**
- Tarefas: two-step delete confirmation with inline toggle (`tarefas/page.tsx:111-127`) — well implemented
- Rotinas: Trash2 button fires `deleteRoutine()` immediately with no confirmation (`rotinas/page.tsx:400`) — data loss risk on misclick

**Navigation gap — Configurações unreachable on mobile:**
- Sidebar (desktop): Dashboard, Chat, Tarefas, Agenda, Configurações + Rotinas in secondary section
- Bottom-nav (mobile): Dashboard, Chat, Tarefas, Agenda, Rotinas — Configurações absent
- A new mobile user cannot access Telegram setup, account info, or work hours settings via touch navigation

**Accessibility gaps:**
- `chat-layout.tsx:92`: ChevronLeft/ChevronRight sidebar toggle — no `aria-label`
- `rotinas/page.tsx:397, 400`: Pencil and Trash2 icon buttons — no `aria-label`
- `chat-layout.tsx:115`: Session delete Trash2 — no `aria-label`
- Only 3 `aria-label` attributes found across all 13 component/page files
- Icon-only buttons are the majority of interactive controls; none outside the above 3 are labeled

**Disabled states — correctly handled:** 19 instances of `disabled:opacity-40`/`disabled:opacity-50` on primary action buttons throughout the app.

---

## Registry Safety

`components.json` not found — shadcn not initialized. Registry audit skipped.

---

## Files Audited

- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/chat/page.tsx`
- `src/app/(dashboard)/tarefas/page.tsx`
- `src/app/(dashboard)/agenda/page.tsx`
- `src/app/(dashboard)/rotinas/page.tsx`
- `src/app/(dashboard)/configuracoes/page.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/components/chat/chat-layout.tsx`
- `src/components/chat/chat-window.tsx`
- `src/components/chat/message-bubble.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/layout/sidebar-item.tsx`
- `src/components/layout/bottom-nav.tsx`
- `src/components/layout/header.tsx`
- `src/app/globals.css`
- `tailwind.config.ts`
