'use client'
import { useFormState as useActionState } from 'react-dom'
import {} from 'react'
import { createContact, updateContact } from '@/lib/crm/contacts'
import { DynamicFieldRenderer } from '@/components/custom-fields/DynamicFieldRenderer'
import { DuplicateBanner } from '@/components/merge/DuplicateBanner'
import type { CustomFieldDefinition } from '@/lib/validations/custom-field'

type Contact = {
  id: string
  full_name: string
  email?: string | null
  phone?: string | null
  cpf?: string | null
  job_title?: string | null
  tags: string[]
  owner_id?: string | null
  custom_fields?: Record<string, unknown>
}

type Props = {
  contact?: Contact
  customFieldDefinitions?: CustomFieldDefinition[]
}

type State = {
  error?: string
  success?: boolean
  duplicate?: { id?: string; full_name?: string; reason: string }
} | null

export function ContactForm({ contact, customFieldDefinitions = [] }: Props) {
  const action = contact ? updateContact.bind(null, contact.id) : createContact
  const [state, formAction, pending] = useActionState<State, FormData>(action as any, null)

  return (
    <form action={formAction} className="space-y-5 max-w-lg">
      <div>
        <label className="block text-sm text-cream/70 mb-1">Nome completo *</label>
        <input name="full_name" defaultValue={contact?.full_name} required
          className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-cream/70 mb-1">E-mail</label>
          <input name="email" type="email" defaultValue={contact?.email ?? ''}
            className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold" />
        </div>
        <div>
          <label className="block text-sm text-cream/70 mb-1">Telefone</label>
          <input name="phone" type="tel" defaultValue={contact?.phone ?? ''} placeholder="+55 11 99999-0000"
            className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-cream/70 mb-1">CPF</label>
          <input name="cpf" defaultValue={contact?.cpf ?? ''} placeholder="000.000.000-00"
            className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold" />
        </div>
        <div>
          <label className="block text-sm text-cream/70 mb-1">Cargo</label>
          <input name="job_title" defaultValue={contact?.job_title ?? ''}
            className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold" />
        </div>
      </div>

      <div>
        <label className="block text-sm text-cream/70 mb-1">Tags (separadas por vírgula)</label>
        <input name="tags" defaultValue={contact?.tags?.join(', ') ?? ''} placeholder="cliente, vip, br"
          className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold" />
      </div>

      {customFieldDefinitions.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-char-3">
          <h3 className="text-sm font-semibold text-cream/60 uppercase tracking-wider">Campos personalizados</h3>
          {customFieldDefinitions.map((def) => (
            <DynamicFieldRenderer key={def.id} def={def} value={contact?.custom_fields?.[def.key]} />
          ))}
        </section>
      )}

      {state?.error === 'duplicate_found' && state.duplicate && (
        <DuplicateBanner duplicate={state.duplicate} contactId={contact?.id} />
      )}
      {state?.error && state.error !== 'duplicate_found' && (
        <p className="text-red-400 text-sm">{state.error}</p>
      )}

      <button type="submit" disabled={pending}
        className="bg-gold text-charcoal font-semibold px-6 py-2 rounded-lg hover:bg-gold/90 disabled:opacity-50 transition-colors">
        {pending ? 'Salvando…' : contact ? 'Salvar alterações' : 'Criar contato'}
      </button>
    </form>
  )
}
