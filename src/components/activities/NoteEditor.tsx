'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createNote } from '@/lib/crm/notes'
import { renderMarkdown } from './markdown'

type Props = {
  subjectType: 'contact' | 'company' | 'deal'
  subjectId: string
  onDone?: () => void
}

export function NoteEditor({ subjectType, subjectId, onDone }: Props) {
  const [body, setBody] = useState('')
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function save() {
    if (!body.trim()) { setError('Nota vazia'); return }
    setError(null)
    startTransition(async () => {
      const result = await createNote({ subject_type: subjectType, subject_id: subjectId, body: body.trim() })
      if ('error' in result) setError(result.error ?? null)
      else { setBody(''); onDone?.(); router.refresh() }
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center text-xs text-cream/50">
        <button type="button" onClick={() => setPreview(false)} className={!preview ? 'text-gold' : 'hover:text-cream'}>Editor</button>
        <span>·</span>
        <button type="button" onClick={() => setPreview(true)} className={preview ? 'text-gold' : 'hover:text-cream'}>Preview</button>
        <span className="ml-auto text-cream/40">**bold** *italic* `code` [link](url) listas</span>
      </div>
      {!preview ? (
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={6}
          placeholder="Escreva uma nota... suporta **markdown** basico"
          className="w-full bg-char-3 text-cream rounded px-2 py-1 border border-char-3 focus:border-gold outline-none text-sm"
          autoFocus
        />
      ) : (
        <div
          className="bg-char-3 rounded px-3 py-2 border border-char-3 text-sm text-cream/90 min-h-[120px]"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
        />
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => onDone?.()} className="px-3 py-1.5 text-sm text-cream/70 hover:text-cream">Cancelar</button>
        <button type="button" onClick={save} disabled={pending || !body.trim()} className="px-3 py-1.5 text-sm bg-gold text-charcoal rounded disabled:opacity-50">
          {pending ? 'Salvando...' : 'Salvar nota'}
        </button>
      </div>
    </div>
  )
}
