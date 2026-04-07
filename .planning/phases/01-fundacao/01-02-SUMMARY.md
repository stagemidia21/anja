---
phase: 01-fundacao
plan: 02
subsystem: design-system
tags: [css-variables, tailwind, fonts, grain-texture, components]
completed: 2026-04-07T19:21:13Z
duration: ~12min
tasks_completed: 2
tasks_total: 2
files_created: 5
files_modified: 3

dependency_graph:
  requires: ["01-01"]
  provides: ["design-tokens", "base-components"]
  affects: ["todos os planos subsequentes"]

tech_stack:
  added: []
  patterns:
    - "CSS Variables RGB space-separated para suporte a alpha modifier no Tailwind"
    - "next/font/google com variable CSS vars no html element"
    - "SVG feTurbulence inline via data URI para grain texture sem imagem externa"
    - "forwardRef em componentes de input para integração com react-hook-form"
    - "Template literals para class merging (sem clsx/cn)"

key_files:
  created:
    - src/components/ui/button.tsx
    - src/components/ui/input.tsx
    - src/components/ui/card.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/spinner.tsx
  modified:
    - src/app/globals.css
    - tailwind.config.ts
    - src/app/layout.tsx

decisions:
  - "CSS variables em RGB space-separated (ex: 26 24 20) e não hex — obrigatório para bg-gold/10 funcionar no Tailwind v3"
  - "Grain via SVG feTurbulence inline (data URI) em vez de imagem externa — sem dependência de arquivo estático"
  - "font-medium (500) proibido — apenas font-normal (400) e font-semibold (600) nesta fase"
  - "Componentes sem shadcn/Radix — implementacao direta em Tailwind para manter identidade premium sem custo de override"

metrics:
  duration: ~12min
  completed_date: 2026-04-07
  tasks: 2
  files: 8
---

# Phase 01 Plan 02: Design System Anja — Summary

CSS Variables RGB + grain texture SVG inline + 3 fontes via next/font + 5 componentes base (Button/Input/Card/Badge/Spinner) implementados do zero sem shadcn, build Next.js limpo.

---

## Tasks Executadas

| Task | Nome | Commit | Arquivos |
|------|------|--------|----------|
| 1 | CSS Variables, Tailwind config, fontes e grain | 7c465ee | globals.css, tailwind.config.ts, layout.tsx |
| 2 | Componentes base (Button, Input, Card, Badge, Spinner) | 7c465ee | src/components/ui/*.tsx (5 arquivos) |

---

## O Que Foi Construído

### Task 1 — Tokens e infraestrutura visual

**globals.css** reescrito com:
- 10 CSS variables RGB (charcoal, char2, char3, gold, gold-light, cream, text-muted, off-white, danger, success)
- `.grain::before` com SVG feTurbulence inline (opacidade 0.035, position:fixed, inset -200%)
- `.safe-area-pb` utility para `env(safe-area-inset-bottom)` no iOS (RNF-02)

**tailwind.config.ts** com:
- Cores customizadas mapeadas via `rgb(var(--token) / <alpha-value>)` — suporta bg-gold/10, border-gold/20, etc.
- fontFamily: display (Cormorant), body (DM Sans), mono (JetBrains)

**layout.tsx** com:
- Cormorant Garamond (pesos 300-700 + italic), DM Sans (400, 600), JetBrains Mono (400)
- Variables CSS concatenadas no `<html>` element
- Body com `font-body bg-charcoal text-cream antialiased grain`
- lang="pt-BR"

### Task 2 — Componentes base

| Componente | Variantes | Destaques |
|------------|-----------|-----------|
| Button | primary, secondary, ghost | loading state com Spinner, disabled via opacity-40 |
| Input | normal, error | forwardRef, focus ring gold/20, erro com danger |
| Card | - | className merge via template literal |
| Badge | free, essencial, executivo, agencias, default | text-[10px] font-normal |
| Spinner | - | 3 dots animate-bounce com animationDelay escalonado |

---

## Verificação Final

```
grep -c "26 24 20" src/app/globals.css          → 1 ✓
grep -c "grain::before" src/app/globals.css     → 1 ✓
grep -c "safe-area-pb" src/app/globals.css      → 1 ✓
grep -c "Cormorant_Garamond" src/app/layout.tsx → 2 ✓
grep -c "grain" src/app/layout.tsx              → 1 ✓
Components existentes                           → 5/5 ✓
grep -r "font-medium" src/                      → 0 ✓
npx next build                                  → ✓ limpo
```

---

## Deviations from Plan

None — plano executado exatamente conforme especificado.

---

## Known Stubs

None — design system é infraestrutura pura, sem dados ou conteúdo renderizado.

---

## Threat Flags

None — design system é puramente visual, sem input de usuário ou superfície de ataque nova.

---

## Self-Check: PASSED

- [x] `src/app/globals.css` existe e contém `--charcoal: 26 24 20`
- [x] `tailwind.config.ts` contém `rgb(var(--charcoal)`
- [x] `src/app/layout.tsx` importa `Cormorant_Garamond`
- [x] `src/components/ui/button.tsx` existe
- [x] `src/components/ui/input.tsx` existe
- [x] `src/components/ui/card.tsx` existe
- [x] `src/components/ui/badge.tsx` existe
- [x] `src/components/ui/spinner.tsx` existe
- [x] Commit `7c465ee` existe no histórico
- [x] Build Next.js limpo sem erros
