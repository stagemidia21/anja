'use client'

import { useState, useTransition } from 'react'
import { inviteMember } from '@/lib/crm/organizations'

interface InviteFormProps {
  organizationId: string
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'viewer', label: 'Visualizador' },
]

export function InviteForm({ organizationId }: InviteFormProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('vendedor')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('email', email)
      formData.set('role', role)
      formData.set('organization_id', organizationId)
      const result = await inviteMember(formData)
      if (result?.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: `Convite enviado para ${email}.` })
        setEmail('')
        setRole('vendedor')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-charcoal-900 rounded-xl border border-charcoal-700 p-6 space-y-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-cream-200 mb-1.5">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colaborador@empresa.com"
            required
            className="w-full px-4 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-600 text-cream-50 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
        <div className="w-44">
          <label className="block text-sm font-medium text-cream-200 mb-1.5">Perfil</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-600 text-cream-50 focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {message && (
        <p className={`text-sm ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
          {message.text}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 rounded-lg bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-semibold transition-colors disabled:opacity-50"
        >
          {isPending ? 'Enviando...' : 'Enviar convite'}
        </button>
      </div>
    </form>
  )
}
