'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { mergeContacts } from '@/lib/crm/merge'

type Contact = {
  id: string
  full_name: string
  email?: string | null
  phone?: string | null
  job_title?: string | null
  tags?: string[]
}

type Props = {
  source: Contact
  target: Contact
  onClose: () => void
}

type Field = 'full_name' | 'email' | 'phone' | 'job_title'

const FIELDS: { key: Field; label: string }[] = [
  { key: 'full_name', label: 'Nome' },
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Telefone' },
  { key: 'job_title', label: 'Cargo' },
]

export function MergeContactsModal({ source, target, onClose }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()
  // survivor = target by default; choices = which contact's value wins per field
  const [choices, setChoices] = useState<Record<Field, 'source' | 'target'>>(
    Object.fromEntries(FIELDS.map(({ key }) => [key, 'target'])) as Record<Field, 'source' | 'target'>
  )

  function pick(field: Field, side: 'source' | 'target') {
    setChoices((c) => ({ ...c, [field]: side }))
  }

  function handleMerge() {
    startTransition(async () => {
      const overrides: Record<string, string | undefined> = {}
      for (const { key } of FIELDS) {
        const winner = choices[key] === 'source' ? source : target
        overrides[key] = winner[key] ?? undefined
      }

      const result = await mergeContacts(source.id, target.id, overrides as any)
      if (result.error) { setError(result.error); return }
      router.push(`/crm/contacts/${target.id}`)
      router.refresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-char-1 border border-char-3 rounded-xl p-6 w-full max-w-2xl shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-cream">Mesclar contatos</h2>
          <button onClick={onClose} className="text-cream/40 hover:text-cream text-xl leading-none">×</button>
        </div>

        <p className="text-sm text-cream/60">
          O contato <strong className="text-cream">{source.full_name}</strong> será mesclado em{' '}
          <strong className="text-cream">{target.full_name}</strong>. Escolha qual valor manter para cada campo.
        </p>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-cream/50 uppercase tracking-wider px-1">
            <span>Campo</span>
            <span>{source.full_name} (origem)</span>
            <span>{target.full_name} (destino)</span>
          </div>
          {FIELDS.map(({ key, label }) => (
            <div key={key} className="grid grid-cols-3 gap-2 items-center">
              <span className="text-sm text-cream/60">{label}</span>
              <button
                onClick={() => pick(key, 'source')}
                className={`text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                  choices[key] === 'source'
                    ? 'border-gold bg-gold/10 text-cream'
                    : 'border-char-3 text-cream/50 hover:border-char-4'
                }`}
              >
                {source[key] ?? <span className="italic text-cream/30">vazio</span>}
              </button>
              <button
                onClick={() => pick(key, 'target')}
                className={`text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                  choices[key] === 'target'
                    ? 'border-gold bg-gold/10 text-cream'
                    : 'border-char-3 text-cream/50 hover:border-char-4'
                }`}
              >
                {target[key] ?? <span className="italic text-cream/30">vazio</span>}
              </button>
            </div>
          ))}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-char-3 rounded-lg text-cream/60 hover:border-gold hover:text-cream transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleMerge}
            disabled={pending}
            className="px-5 py-2 text-sm bg-gold text-charcoal font-semibold rounded-lg hover:bg-gold/90 disabled:opacity-50 transition-colors"
          >
            {pending ? 'Mesclando…' : 'Confirmar mesclagem'}
          </button>
        </div>
      </div>
    </div>
  )
}
