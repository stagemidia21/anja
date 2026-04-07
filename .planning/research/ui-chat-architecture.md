# UI & Chat Architecture Research — Anja

**Projeto:** Anja — Secretária Executiva com IA  
**Data:** 2026-04-07  
**Confiança geral:** MEDIUM (conhecimento de treinamento até ago/2025; WebSearch bloqueado no ambiente)

---

## 1. Chat com Streaming + Tool Use (Claude API)

### Decisão: Vercel AI SDK `useChat` (não implementação manual)

**Justificativa:** O Vercel AI SDK abstrai o protocolo de streaming, gerencia o estado de loading, reconstrói mensagens com tool calls e resultados, e tem suporte nativo ao Anthropic SDK. Implementar manualmente exige lidar com `text/event-stream`, parsing de chunks, reconstituição de deltas e estado de ferramentas — semanas de trabalho sem ganho real para esse projeto.

**Confiança:** HIGH — Vercel AI SDK é o padrão estabelecido para Next.js + Claude streaming.

---

### 1.1 Setup básico com tool use

```typescript
// app/api/chat/route.ts
import { anthropic } from '@ai-sdk/anthropic'
import { streamText, tool } from 'ai'
import { z } from 'zod'
import { createCalendarEvent } from '@/lib/google-calendar'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = await streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: `Você é Anja, secretária executiva com IA...`,
    messages,
    tools: {
      createEvent: tool({
        description: 'Cria um evento no Google Calendar do usuário',
        parameters: z.object({
          title: z.string().describe('Título do evento'),
          start: z.string().describe('Data/hora início em ISO 8601'),
          end: z.string().describe('Data/hora fim em ISO 8601'),
          description: z.string().optional(),
        }),
        execute: async ({ title, start, end, description }) => {
          // execute roda server-side — chama a Google Calendar API aqui
          const event = await createCalendarEvent({ title, start, end, description })
          return { success: true, eventId: event.id, link: event.htmlLink }
        },
      }),
      listEvents: tool({
        description: 'Lista eventos do Google Calendar',
        parameters: z.object({
          date: z.string().describe('Data em YYYY-MM-DD'),
        }),
        execute: async ({ date }) => {
          // retornar lista de eventos do dia
        },
      }),
    },
    maxSteps: 5, // permite tool call → resposta → tool call em cadeia
  })

  return result.toDataStreamResponse()
}
```

```typescript
// hooks/useAnjaChat.ts
import { useChat } from 'ai/react'

export function useAnjaChat() {
  return useChat({
    api: '/api/chat',
    maxSteps: 5, // sincronizar com o server
    onError: (error) => {
      console.error('Anja chat error:', error)
    },
  })
}
```

---

### 1.2 Loading state durante tool use

O `useChat` expõe `isLoading` (true durante todo o streaming) mas não diferencia "IA digitando" de "ferramenta executando". Para UI granular, usar `messages` para detectar `tool-invocations`.

```typescript
// components/chat/MessageList.tsx
import { Message } from 'ai'

interface ToolInvocation {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  state: 'call' | 'result' | 'partial-call'
  result?: unknown
}

function MessageBubble({ message }: { message: Message }) {
  const hasToolCalls = message.toolInvocations && message.toolInvocations.length > 0

  return (
    <div className="message-bubble">
      {/* Texto normal da IA */}
      {message.content && <p>{message.content}</p>}

      {/* Renderizar tool invocations inline */}
      {message.toolInvocations?.map((tool: ToolInvocation) => (
        <ToolCallCard key={tool.toolCallId} tool={tool} />
      ))}
    </div>
  )
}

function ToolCallCard({ tool }: { tool: ToolInvocation }) {
  if (tool.state === 'call' || tool.state === 'partial-call') {
    // Ferramenta chamada mas resultado ainda não chegou — mostrar loading
    return <ToolLoading toolName={tool.toolName} args={tool.args} />
  }

  if (tool.state === 'result') {
    // Resultado recebido — mostrar inline
    return <ToolResult toolName={tool.toolName} result={tool.result} />
  }

  return null
}
```

```typescript
// components/chat/ToolLoading.tsx
// Estado: Claude está executando a ferramenta (ex: criando evento no Calendar)

const TOOL_LABELS: Record<string, string> = {
  createEvent: 'Criando evento na agenda',
  listEvents: 'Consultando agenda',
  createTask: 'Criando tarefa',
  updateTask: 'Atualizando tarefa',
}

export function ToolLoading({ toolName, args }: { toolName: string; args: Record<string, unknown> }) {
  const label = TOOL_LABELS[toolName] ?? 'Processando'

  return (
    <div className="tool-loading flex items-center gap-2 text-sm py-2 px-3 rounded-lg bg-[var(--char2)] border border-[var(--char3)]">
      {/* Spinner minimalista — 3 dots animados */}
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1 h-1 rounded-full bg-[var(--gold)] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      <span className="text-[var(--text)]">{label}...</span>
    </div>
  )
}
```

```typescript
// components/chat/ToolResult.tsx
// Resultado inline após execução bem-sucedida

import { CalendarIcon, CheckIcon, AlertCircleIcon } from 'lucide-react'

interface CreateEventResult {
  success: boolean
  eventId?: string
  link?: string
  error?: string
}

export function ToolResult({ toolName, result }: { toolName: string; result: unknown }) {
  if (toolName === 'createEvent') {
    const r = result as CreateEventResult

    if (!r.success) {
      return <ToolError message={r.error ?? 'Erro ao criar evento'} />
    }

    return (
      <div className="tool-result flex items-center gap-2 text-sm py-2 px-3 rounded-lg bg-[var(--char2)] border border-[var(--char3)]">
        <CheckIcon className="w-4 h-4 text-[var(--success)] shrink-0" />
        <CalendarIcon className="w-4 h-4 text-[var(--gold)] shrink-0" />
        <span className="text-[var(--cream)]">
          Evento criado
          {r.link && (
            <a
              href={r.link}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-[var(--gold)] hover:text-[var(--gold-light)] underline underline-offset-2"
            >
              Ver no Calendar →
            </a>
          )}
        </span>
      </div>
    )
  }

  // Fallback genérico para outras ferramentas
  return (
    <div className="tool-result text-xs text-[var(--text)] py-1 px-2 rounded bg-[var(--char2)]">
      <CheckIcon className="inline w-3 h-3 mr-1 text-[var(--success)]" />
      Concluído
    </div>
  )
}

function ToolError({ message }: { message: string }) {
  return (
    <div className="tool-error flex items-center gap-2 text-sm py-2 px-3 rounded-lg bg-[var(--char2)] border border-[var(--danger)]/30">
      <AlertCircleIcon className="w-4 h-4 text-[var(--danger)] shrink-0" />
      <span className="text-[var(--danger)]">{message}</span>
    </div>
  )
}
```

---

### 1.3 Tratamento de erros de tool use

**Estratégia em camadas:**

```typescript
// lib/google-calendar.ts — Wrapper com error handling semântico

export class CalendarError extends Error {
  constructor(
    message: string,
    public code: 'AUTH_EXPIRED' | 'QUOTA_EXCEEDED' | 'NETWORK' | 'NOT_FOUND' | 'UNKNOWN'
  ) {
    super(message)
    this.name = 'CalendarError'
  }
}

export async function createCalendarEvent(params: CreateEventParams) {
  try {
    const oauth2Client = await getOAuth2Client() // pega token do Supabase
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: params.title,
        start: { dateTime: params.start },
        end: { dateTime: params.end },
        description: params.description,
      },
    })
    return response.data
  } catch (error: unknown) {
    if (isGoogleAuthError(error)) {
      throw new CalendarError('Token expirado. Reconecte o Google Calendar.', 'AUTH_EXPIRED')
    }
    if (isQuotaError(error)) {
      throw new CalendarError('Limite de requests do Google Calendar atingido.', 'QUOTA_EXCEEDED')
    }
    throw new CalendarError('Erro ao conectar com o Google Calendar.', 'NETWORK')
  }
}
```

```typescript
// Na tool execute — capturar e retornar erro estruturado (nunca lançar)
execute: async (args) => {
  try {
    const event = await createCalendarEvent(args)
    return { success: true, eventId: event.id, link: event.htmlLink }
  } catch (error) {
    if (error instanceof CalendarError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        // Se AUTH_EXPIRED, a UI pode mostrar botão "Reconectar Google"
        requiresAction: error.code === 'AUTH_EXPIRED' ? 'reconnect_google' : undefined,
      }
    }
    return { success: false, error: 'Erro inesperado ao criar evento.' }
  }
},
```

**Regra crítica:** `execute` nunca deve lançar exceção não tratada. O Vercel AI SDK para o stream se a tool lançar. Retorne sempre `{ success: false, error: string }` em vez de `throw`.

---

### 1.4 `useChat` vs implementação manual — Decisão final

| Critério | `useChat` (Vercel AI SDK) | Manual |
|----------|--------------------------|--------|
| Tempo de implementação | Horas | Semanas |
| Tool invocation state | Built-in (`toolInvocations`) | DIY |
| Streaming reconstitution | Automático | DIY |
| Suporte Anthropic | Oficial (`@ai-sdk/anthropic`) | DIY |
| Controle granular | Suficiente via `onToolCall` | Total |
| Manutenção | Atualizada pela Vercel | Por você |

**Decisão: `useChat` do Vercel AI SDK v3+.** Implementação manual só faz sentido se houver requisito muito específico de protocolo que o SDK não suporte — não é o caso aqui.

**Packages:**
```bash
npm install ai @ai-sdk/anthropic
```

---

## 2. Kanban de Tarefas em React

### Decisão: `dnd-kit`

**`react-beautiful-dnd`** está oficialmente descontinuado desde 2022 (Atlassian arquivou o repo).

**`@hello-pangea/dnd`** é um fork comunitário mantido — funciona, mas é manutenção reativa, não evolução ativa.

**`dnd-kit`** é a recomendação atual do ecossistema React: modular, acessível, sem dependências de DOM específicas, suporta touch nativo, e tem primitivas suficientes para um kanban sem overhead.

**Confiança:** HIGH — consenso claro no ecossistema, dnd-kit é o successor de fato.

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

### 2.1 Estrutura kanban com dnd-kit

```typescript
// components/kanban/KanbanBoard.tsx
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useState } from 'react'

export type TaskStatus = 'hoje' | 'semana' | 'depois' | 'feito'

export interface Task {
  id: string
  title: string
  status: TaskStatus
  priority: 'alta' | 'media' | 'baixa'
  createdAt: string
}

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'depois', label: 'Depois' },
  { id: 'feito', label: 'Feito' },
]

export function KanbanBoard({ tasks, onTaskMove }: {
  tasks: Task[]
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    // over.id pode ser o id de uma coluna ou de um task
    const overId = over.id as string
    const targetStatus = COLUMNS.find((c) => c.id === overId)?.id
      ?? tasks.find((t) => t.id === overId)?.status

    if (targetStatus && targetStatus !== tasks.find((t) => t.id === active.id)?.status) {
      onTaskMove(active.id as string, targetStatus)
    }
  }

  const activeTask = tasks.find((t) => t.id === activeId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasks.filter((t) => t.status === col.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}
```

---

### 2.2 Persistência otimista com Supabase

```typescript
// hooks/useTasks.ts — Otimismo primeiro, rollback em erro

import { useOptimistic } from 'react' // React 19 / Next.js 14 App Router
import { createClient } from '@/lib/supabase/client'
import type { Task, TaskStatus } from '@/components/kanban/KanbanBoard'

export function useTasks(initialTasks: Task[]) {
  const supabase = createClient()

  // useOptimistic: aplica mudança imediata na UI, mantém estado real separado
  const [optimisticTasks, addOptimistic] = useOptimistic(
    initialTasks,
    (state: Task[], { taskId, newStatus }: { taskId: string; newStatus: TaskStatus }) =>
      state.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
  )

  async function moveTask(taskId: string, newStatus: TaskStatus) {
    // 1. Atualiza UI imediatamente
    addOptimistic({ taskId, newStatus })

    // 2. Persiste no banco
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId)

    if (error) {
      // React reverterá automaticamente o optimistic update
      // (o estado real não mudou, então na próxima render fica consistente)
      console.error('Erro ao mover task:', error)
      // Opcional: mostrar toast de erro
    }
  }

  return { tasks: optimisticTasks, moveTask }
}
```

**Nota:** `useOptimistic` é React 19 / Next.js 14+. Para versões anteriores, usar `useState` com rollback manual em catch.

---

### 2.3 Sync em tempo real com Supabase Realtime

```typescript
// hooks/useTasksRealtime.ts
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/components/kanban/KanbanBoard'

export function useTasksRealtime(
  userId: string,
  onUpdate: (task: Task) => void,
  onDelete: (taskId: string) => void
) {
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`tasks:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            onUpdate(payload.new as Task)
          }
          if (payload.eventType === 'DELETE') {
            onDelete(payload.old.id as string)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])
}
```

**Importante:** O Realtime só é necessário se houver multi-dispositivo (usuário no mobile + desktop ao mesmo tempo). Para MVP single-device, o update otimista + fetch on-focus é suficiente e mais simples.

---

## 3. Dark Premium UI em Tailwind

### 3.1 CSS Variables + Tailwind — padrão correto

O padrão correto é definir as variáveis no CSS global e referenciar via Tailwind config. Dessa forma, os tokens ficam em um lugar só e podem mudar por tema sem tocar em classes.

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --charcoal: 26 24 20;        /* #1A1814 em RGB separado por espaço */
    --char2: 42 38 32;           /* #2A2620 */
    --char3: 58 53 47;           /* #3A352F */
    --gold: 201 168 76;          /* #C9A84C */
    --gold-light: 232 201 106;   /* #E8C96A */
    --cream: 245 240 232;        /* #F5F0E8 */
    --text-muted: 138 130 120;   /* #8A8278 */
    --white: 253 250 245;        /* #FDFAF5 */
    --danger: 239 68 68;         /* #EF4444 */
    --success: 34 197 94;        /* #22C55E */
  }
}
```

**Por que RGB separado e não hex?** Para poder usar `rgb(var(--gold) / 0.5)` — opacity modifier do Tailwind (`text-gold/50`). Com hex não funciona.

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: 'rgb(var(--charcoal) / <alpha-value>)',
        'char-2': 'rgb(var(--char2) / <alpha-value>)',
        'char-3': 'rgb(var(--char3) / <alpha-value>)',
        gold: 'rgb(var(--gold) / <alpha-value>)',
        'gold-light': 'rgb(var(--gold-light) / <alpha-value>)',
        cream: 'rgb(var(--cream) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
        'off-white': 'rgb(var(--white) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-cormorant)', 'Georgia', 'serif'],
        body: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
    },
  },
}

export default config
```

Uso nas classes:
```html
<!-- Com opacity modifier automático -->
<div class="bg-charcoal text-cream border border-char-3">
<span class="text-gold/70">texto dourado 70% opaco</span>
<div class="bg-gold/10 hover:bg-gold/20">hover suave</div>
```

---

### 3.2 Grain texture CSS puro

Grain cria a textura premium sem imagem externa. Usar `::after` com `background-image: url("data:image/svg+xml,...")` ou filter SVG.

```css
/* globals.css — grain overlay via pseudo-elemento */
@layer utilities {
  .grain {
    position: relative;
  }

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
}
```

```tsx
// app/layout.tsx
<body className="grain bg-charcoal text-cream">
```

**Ajustes de intensidade:** `opacity: 0.02` (sutil) a `opacity: 0.06` (visível). Para a Anja, `0.03`–`0.04` é o ponto ideal — presente sem distrair.

**Alternativa mais leve:** `backdrop-filter: url(#noise)` direto no elemento, sem pseudo-elemento, mas tem menor suporte.

---

### 3.3 Fontes com `next/font`

```typescript
// app/layout.tsx
import { Cormorant_Garamond, DM_Sans } from 'next/font/google'
import { JetBrains_Mono } from 'next/font/google'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="font-body">
        {children}
      </body>
    </html>
  )
}
```

**Importante:** `variable` expõe a fonte como CSS custom property (`--font-cormorant`). Ao adicionar no `<html>`, fica disponível em todo o DOM. O Tailwind usa via `fontFamily` config acima.

**Títulos (Cormorant Garamond):**
```html
<h1 class="font-display text-3xl font-light tracking-wide">
```

**Body (DM Sans):**
```html
<p class="font-body text-base">  <!-- ou simplesmente sem classe, já é o padrão -->
```

---

## 4. Mobile-First Sidebar com Bottom Nav

### Decisão: Estado React + Tailwind + breakpoints — sem biblioteca externa

Para um projeto com design system próprio e identidade visual forte (dark premium editorial), bibliotecas de layout como shadcn/ui Sidebar ou Radix Navigation trazem mais override CSS do que valor. Implementação direta em ~80 linhas é preferível.

---

### 4.1 Implementação completa

```typescript
// components/layout/AppShell.tsx
'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  MessageSquareIcon,
  LayoutDashboardIcon,
  CheckSquareIcon,
  CalendarIcon,
  SettingsIcon,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboardIcon, label: 'Dashboard' },
  { href: '/chat', icon: MessageSquareIcon, label: 'Anja' },
  { href: '/tarefas', icon: CheckSquareIcon, label: 'Tarefas' },
  { href: '/agenda', icon: CalendarIcon, label: 'Agenda' },
  { href: '/configuracoes', icon: SettingsIcon, label: 'Config' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-charcoal flex">
      {/* Sidebar — desktop (md+) */}
      <aside className={`
        hidden md:flex flex-col
        w-16 lg:w-56
        bg-char-2 border-r border-char-3
        sticky top-0 h-screen
        transition-all duration-200
      `}>
        {/* Logo */}
        <div className="px-4 py-6 border-b border-char-3">
          <span className="font-display text-gold text-xl font-medium hidden lg:block">Anja</span>
          <span className="font-display text-gold text-xl font-medium lg:hidden">A</span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map((item) => (
            <SidebarItem
              key={item.href}
              item={item}
              isActive={pathname.startsWith(item.href)}
            />
          ))}
        </nav>
      </aside>

      {/* Overlay mobile sidebar (opcional — se precisar de sidebar deslizante no mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-charcoal/80 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        {children}
      </main>

      {/* Bottom nav — mobile only (abaixo de md) */}
      <nav className="
        md:hidden
        fixed bottom-0 left-0 right-0 z-50
        bg-char-2 border-t border-char-3
        flex items-center justify-around
        px-2 py-2
        safe-area-pb
      ">
        {NAV_ITEMS.map((item) => (
          <BottomNavItem
            key={item.href}
            item={item}
            isActive={pathname.startsWith(item.href)}
          />
        ))}
      </nav>
    </div>
  )
}

function SidebarItem({
  item,
  isActive,
}: {
  item: (typeof NAV_ITEMS)[0]
  isActive: boolean
}) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg
        transition-colors duration-150
        ${isActive
          ? 'bg-gold/10 text-gold border border-gold/20'
          : 'text-muted hover:text-cream hover:bg-char-3'
        }
      `}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-sm font-medium hidden lg:block">{item.label}</span>
    </Link>
  )
}

function BottomNavItem({
  item,
  isActive,
}: {
  item: (typeof NAV_ITEMS)[0]
  isActive: boolean
}) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={`
        flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg
        transition-colors duration-150
        ${isActive ? 'text-gold' : 'text-muted'}
      `}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{item.label}</span>
    </Link>
  )
}
```

```css
/* globals.css — Safe area para iPhone home indicator */
@layer utilities {
  .safe-area-pb {
    padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
  }
}
```

**Comportamento por breakpoint:**
- Mobile (`< md`): sem sidebar, bottom nav fixo no rodapé
- Tablet/Desktop (`>= md`): sidebar esquerda, ícones apenas (w-16)
- Large (`>= lg`): sidebar com ícone + label (w-56)

**O `pb-16 md:pb-0` no `<main>`** garante que o conteúdo não fique escondido atrás do bottom nav.

---

## Decisões Consolidadas

| Área | Decisão | Confiança |
|------|---------|-----------|
| Chat streaming | Vercel AI SDK `useChat` + `streamText` com `execute` server-side | HIGH |
| Tool loading state | `toolInvocations` do `useChat` + componente `ToolCallCard` com `state === 'call'` | HIGH |
| Tool error handling | `execute` retorna `{ success: false }` — nunca lança exceção | HIGH |
| Kanban DnD | `dnd-kit` (`@dnd-kit/core` + `@dnd-kit/sortable`) | HIGH |
| Persistência otimista | `useOptimistic` (React 19) + rollback automático | HIGH |
| Realtime sync | Supabase Realtime `postgres_changes` — só se multi-dispositivo for MVP | MEDIUM |
| CSS tokens | CSS Variables RGB separado + `<alpha-value>` no Tailwind config | HIGH |
| Grain texture | SVG `feTurbulence` inline via `data:image/svg+xml` em `::before` | HIGH |
| Fontes | `next/font/google` com `variable` prop no `<html>` | HIGH |
| Sidebar | Estado React + Tailwind breakpoints — sem biblioteca | HIGH |

---

## Pitfalls Identificados

1. **`execute` lançando exceção:** Quebra o stream inteiro. Sempre retornar objeto estruturado.
2. **`maxSteps` desalinhado:** Se server tem `maxSteps: 5` e client tem `maxSteps: 3`, o cliente para antes do servidor terminar. Sincronizar.
3. **CSS Variables sem RGB separado:** `bg-gold/50` não funciona com hex. Precisa de `201 168 76` não `#C9A84C`.
4. **`pb-16` ausente no main:** Bottom nav cobre conteúdo do rodapé. Obrigatório no mobile.
5. **OAuth token expirado silencioso:** Google Calendar retorna 401 que pode ser swallowed. Verificar token antes de cada request ou interceptar erro 401 especificamente.
6. **Grain com `position: fixed` no pseudo-elemento:** Se a página tiver `transform` ou `filter` num ancestral, o `position: fixed` do grain fica contido naquele elemento. Evitar `transform` no `<body>`.
7. **Cormorant Garamond peso leve em texto pequeno:** Abaixo de 14px, `font-weight: 300` some em telas low-DPI. Usar mínimo `font-weight: 400` para texto funcional.

---

*Fontes: Vercel AI SDK docs, Anthropic API docs, dnd-kit.com, Next.js docs — conhecimento de treinamento até ago/2025. Verificar changelogs antes de implementar se houver breaking changes.*
