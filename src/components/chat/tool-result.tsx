'use client'

import { CheckCircle2, AlertCircle } from 'lucide-react'

const TOOL_SUCCESS_LABELS: Record<string, string> = {
  create_calendar_event: 'Evento criado',
  list_calendar_events: 'Agenda consultada',
  create_task: 'Tarefa criada',
  list_tasks: 'Tarefas consultadas',
}

interface ToolResultData {
  success: boolean
  data?: unknown
  error?: string
}

interface ToolResultProps {
  toolName: string
  result: unknown
}

export function ToolError({ message }: { message: string }) {
  return (
    <div className="bg-char-2 border border-char-3 rounded-lg px-3 py-2 flex items-center gap-2 text-sm mt-2">
      <AlertCircle className="w-4 h-4 text-danger flex-shrink-0" />
      <span className="text-danger">{message}</span>
    </div>
  )
}

export function ToolResult({ toolName, result }: ToolResultProps) {
  const data = result as ToolResultData

  if (!data?.success) {
    return <ToolError message={data?.error ?? 'Ocorreu um erro ao executar a ação.'} />
  }

  const label = TOOL_SUCCESS_LABELS[toolName] ?? 'Concluído'

  return (
    <div className="bg-char-2 border border-char-3 rounded-lg px-3 py-2 flex items-center gap-2 text-sm mt-2">
      <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
      <span className="text-cream">{label}</span>
    </div>
  )
}
