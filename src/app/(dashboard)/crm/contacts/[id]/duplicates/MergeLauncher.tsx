'use client'
import { useState } from 'react'
import { MergeContactsModal } from '@/components/merge/MergeContactsModal'
import type { ContactDuplicate } from '@/lib/crm/duplicates'

type Contact = {
  id: string
  full_name: string
  email?: string | null
  phone?: string | null
  job_title?: string | null
  tags?: string[]
}

type Props = {
  contact: Contact
  duplicates: ContactDuplicate[]
}

const REASON_LABEL: Record<string, string> = {
  email: 'Mesmo e-mail',
  phone: 'Mesmo telefone',
  name: 'Nome similar',
}

export function MergeLauncher({ contact, duplicates }: Props) {
  const [mergeTarget, setMergeTarget] = useState<ContactDuplicate | null>(null)

  if (duplicates.length === 0) {
    return (
      <div className="text-center py-12 text-cream/40">
        Nenhuma duplicata encontrada para este contato.
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {duplicates.map((dup) => (
          <div
            key={dup.id}
            className="flex items-center justify-between p-4 bg-char-2 border border-char-3 rounded-lg"
          >
            <div className="space-y-0.5">
              <p className="font-medium text-cream">{dup.full_name}</p>
              <p className="text-sm text-cream/50">
                {dup.email && <span className="mr-3">{dup.email}</span>}
                {dup.phone && <span>{dup.phone}</span>}
              </p>
              <span className="inline-block text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-2 py-0.5 rounded-full">
                {REASON_LABEL[dup.reason] ?? dup.reason}
              </span>
            </div>
            <button
              onClick={() => setMergeTarget(dup)}
              className="px-4 py-2 text-sm bg-gold text-charcoal font-semibold rounded-lg hover:bg-gold/90 transition-colors"
            >
              Mesclar
            </button>
          </div>
        ))}
      </div>

      {mergeTarget && (
        <MergeContactsModal
          source={contact}
          target={mergeTarget}
          onClose={() => setMergeTarget(null)}
        />
      )}
    </>
  )
}
