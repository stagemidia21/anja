'use client'

import { Spinner } from '@/components/ui/spinner'

const TOOL_LABELS: Record<string, string> = {
  create_calendar_event: 'Criando evento na agenda',
  list_calendar_events: 'Consultando agenda',
  create_task: 'Criando tarefa',
  list_tasks: 'Consultando tarefas',
}

interface ToolLoadingProps {
  toolName: string
}

export function ToolLoading({ toolName }: ToolLoadingProps) {
  const label = TOOL_LABELS[toolName] ?? 'Processando'

  return (
    <div className="bg-char-2 border border-char-3 rounded-lg px-3 py-2 flex items-center gap-2 mt-2">
      <Spinner />
      <span className="text-sm text-cream">{label}...</span>
    </div>
  )
}
