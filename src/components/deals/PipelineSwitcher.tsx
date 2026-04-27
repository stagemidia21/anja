'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

type Pipeline = { id: string; name: string; is_default: boolean }

type Props = {
  pipelines: Pipeline[]
  currentId: string
}

export function PipelineSwitcher({ pipelines, currentId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  function pick(id: string) {
    const p = new URLSearchParams(params.toString())
    p.set('pipeline', id)
    p.delete('page')
    router.push(`${pathname}?${p.toString()}`)
  }

  return (
    <select
      value={currentId}
      onChange={(e) => pick(e.target.value)}
      className="bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream text-sm focus:outline-none focus:border-gold"
    >
      {pipelines.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
          {p.is_default ? ' (padrao)' : ''}
        </option>
      ))}
    </select>
  )
}
