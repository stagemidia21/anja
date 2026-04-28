'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { archiveDeal } from '@/lib/crm/deals'
import { OutcomeModal } from '@/components/deals/OutcomeModal'

export function DealDetailActions({ dealId, disabled }: { dealId: string; disabled: boolean }) {
  const router = useRouter()
  const [target, setTarget] = useState<'won' | 'lost' | null>(null)

  async function onArchive() {
    if (!confirm('Arquivar este deal?')) return
    const res = await archiveDeal(dealId)
    if ('error' in res && res.error) {
      toast.error(res.error)
    } else {
      toast.success('Deal arquivado')
      router.push('/crm/pipeline')
    }
  }

  return (
    <>
      <button
        onClick={() => setTarget('won')}
        disabled={disabled}
        className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-sm disabled:opacity-40"
      >
        Ganhar
      </button>
      <button
        onClick={() => setTarget('lost')}
        disabled={disabled}
        className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 text-sm disabled:opacity-40"
      >
        Perder
      </button>
      <button
        onClick={onArchive}
        className="px-4 py-2 rounded-lg border border-char-3 hover:border-red-500 text-cream/60 hover:text-red-300 text-sm"
      >
        Arquivar
      </button>
      {target && (
        <OutcomeModal
          dealId={dealId}
          outcome={target}
          onClose={() => setTarget(null)}
          onDone={() => {
            setTarget(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
