'use client'
import { useFormState as useActionState } from 'react-dom'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { markDealOutcome } from '@/lib/crm/deals'

type Props = {
  dealId: string
  outcome: 'won' | 'lost'
  onClose: () => void
  onDone: () => void
}

type State = { error?: string; success?: boolean } | null

async function submitAction(
  dealId: string,
  outcome: 'won' | 'lost',
  _prev: State,
  formData: FormData,
): Promise<State> {
  const close_reason = (formData.get('close_reason') as string) || ''
  const res = await markDealOutcome(dealId, { outcome, close_reason })
  if ('error' in res && res.error) return { error: res.error }
  return { success: true }
}

export function OutcomeModal({ dealId, outcome, onClose, onDone }: Props) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    submitAction.bind(null, dealId, outcome),
    null,
  )

  useEffect(() => {
    if (state?.success) {
      toast.success(
        outcome === 'won' ? 'Deal marcado como ganho' : 'Deal marcado como perdido',
      )
      onDone()
    } else if (state?.error) {
      toast.error(state.error)
    }
  }, [state, outcome, onDone])

  const title = outcome === 'won' ? 'Marcar como ganho' : 'Marcar como perdido'
  const btnClass =
    outcome === 'won' ? 'bg-emerald-500 text-charcoal' : 'bg-red-500 text-charcoal'

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-char-2 border border-char-3 rounded-lg w-full max-w-md p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-cream font-semibold">{title}</h3>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-sm text-cream/70 mb-1">
              Motivo {outcome === 'lost' ? '(recomendado)' : '(opcional)'}
            </label>
            <textarea
              name="close_reason"
              rows={3}
              className="w-full bg-charcoal border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold"
              placeholder={
                outcome === 'won'
                  ? 'Ex: cliente ja validou orcamento...'
                  : 'Ex: preco, concorrente, timing...'
              }
            />
          </div>

          {state?.error && <p className="text-red-400 text-sm">{state.error}</p>}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-char-3 text-cream/70 hover:border-gold text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className={`px-4 py-2 rounded-lg font-semibold text-sm disabled:opacity-50 ${btnClass}`}
            >
              {pending ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
