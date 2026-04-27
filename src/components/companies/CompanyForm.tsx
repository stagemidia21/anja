'use client'
import { useFormState as useActionState } from 'react-dom'
import {} from 'react'
import { createCompany, updateCompany } from '@/lib/crm/companies'
import { DynamicFieldRenderer } from '@/components/custom-fields/DynamicFieldRenderer'
import { DuplicateBanner } from '@/components/merge/DuplicateBanner'
import type { CustomFieldDefinition } from '@/lib/validations/custom-field'

type Company = {
  id: string
  name: string
  domain?: string | null
  cnpj?: string | null
  industry?: string | null
  size?: string | null
  tags: string[]
  custom_fields?: Record<string, unknown>
}

type Props = {
  company?: Company
  customFieldDefinitions?: CustomFieldDefinition[]
}

type State = {
  error?: string
  success?: boolean
  duplicate?: { id?: string; name?: string; reason: string }
} | null

const SIZE_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'micro', label: 'Micro' },
  { value: 'pequena', label: 'Pequena' },
  { value: 'media', label: 'Média' },
  { value: 'grande', label: 'Grande' },
]

export function CompanyForm({ company, customFieldDefinitions = [] }: Props) {
  const action = company ? updateCompany.bind(null, company.id) : createCompany
  const [state, formAction, pending] = useActionState<State, FormData>(action as any, null)

  return (
    <form action={formAction} className="space-y-5 max-w-lg">
      <div>
        <label className="block text-sm text-cream/70 mb-1">Nome da empresa *</label>
        <input name="name" defaultValue={company?.name} required
          className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-cream/70 mb-1">Domínio</label>
          <input name="domain" defaultValue={company?.domain ?? ''} placeholder="empresa.com.br"
            className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold" />
        </div>
        <div>
          <label className="block text-sm text-cream/70 mb-1">CNPJ</label>
          <input name="cnpj" defaultValue={company?.cnpj ?? ''} placeholder="00.000.000/0001-00"
            className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-cream/70 mb-1">Setor</label>
          <input name="industry" defaultValue={company?.industry ?? ''} placeholder="Tecnologia, Saúde…"
            className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold" />
        </div>
        <div>
          <label className="block text-sm text-cream/70 mb-1">Porte</label>
          <select name="size" defaultValue={company?.size ?? ''}
            className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold">
            {SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-cream/70 mb-1">Tags (separadas por vírgula)</label>
        <input name="tags" defaultValue={company?.tags?.join(', ') ?? ''} placeholder="parceiro, fornecedor"
          className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold" />
      </div>

      {customFieldDefinitions.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-char-3">
          <h3 className="text-sm font-semibold text-cream/60 uppercase tracking-wider">Campos personalizados</h3>
          {customFieldDefinitions.map((def) => (
            <DynamicFieldRenderer key={def.id} def={def} value={company?.custom_fields?.[def.key]} />
          ))}
        </section>
      )}

      {state?.error === 'duplicate_found' && state.duplicate && (
        <DuplicateBanner duplicate={state.duplicate} />
      )}
      {state?.error && state.error !== 'duplicate_found' && (
        <p className="text-red-400 text-sm">{state.error}</p>
      )}

      <button type="submit" disabled={pending}
        className="bg-gold text-charcoal font-semibold px-6 py-2 rounded-lg hover:bg-gold/90 disabled:opacity-50 transition-colors">
        {pending ? 'Salvando…' : company ? 'Salvar alterações' : 'Criar empresa'}
      </button>
    </form>
  )
}
