'use client'

import { useState, useTransition } from 'react'
import { createOrg } from '@/lib/crm/organizations'

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Belem', label: 'Belém (GMT-3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  { value: 'America/Recife', label: 'Recife (GMT-3)' },
  { value: 'America/Bahia', label: 'Salvador (GMT-3)' },
  { value: 'America/Porto_Velho', label: 'Porto Velho (GMT-4)' },
  { value: 'America/Boa_Vista', label: 'Boa Vista (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (GMT-2)' },
  { value: 'America/New_York', label: 'Nova York (GMT-5)' },
  { value: 'Europe/London', label: 'Londres (GMT)' },
  { value: 'Europe/Lisbon', label: 'Lisboa (GMT)' },
]

const CURRENCIES = [
  { value: 'BRL', label: 'BRL — Real brasileiro' },
  { value: 'USD', label: 'USD — Dólar americano' },
  { value: 'EUR', label: 'EUR — Euro' },
]

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
}

const STEPS = ['Organização', 'Configurações', 'Integrações']

export function OnboardingForm() {
  const [step, setStep] = useState(1)
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [timezone, setTimezone] = useState('America/Sao_Paulo')
  const [currency, setCurrency] = useState('BRL')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setOrgName(val)
    if (!slugEdited) {
      setOrgSlug(slugify(val))
    }
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlugEdited(true)
    setOrgSlug(slugify(e.target.value))
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (step === 1) {
      if (orgName.trim().length < 2) {
        setError('Nome da organização deve ter ao menos 2 caracteres.')
        return
      }
      if (orgSlug.length < 2) {
        setError('Slug deve ter ao menos 2 caracteres.')
        return
      }
    }
    setStep((s) => Math.min(s + 1, 3))
  }

  function handleBack() {
    setError(null)
    setStep((s) => Math.max(s - 1, 1))
  }

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('org_name', orgName)
      formData.set('org_slug', orgSlug)
      formData.set('timezone', timezone)
      formData.set('currency', currency)
      const result = await createOrg(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="bg-charcoal-900 rounded-2xl border border-charcoal-700 p-8">
      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((label, i) => {
          const n = i + 1
          const isActive = step === n
          const isDone = step > n
          return (
            <div key={n} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={[
                  'h-1 w-full rounded-full transition-colors',
                  isDone ? 'bg-gold-500' : isActive ? 'bg-gold-400' : 'bg-charcoal-700',
                ].join(' ')}
              />
              <span
                className={[
                  'text-xs font-medium',
                  isActive ? 'text-gold-400' : isDone ? 'text-gold-600' : 'text-charcoal-500',
                ].join(' ')}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Step 1: Nome + Slug */}
      {step === 1 && (
        <form onSubmit={handleNext} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-cream-200 mb-1.5">
              Nome da organização
            </label>
            <input
              type="text"
              value={orgName}
              onChange={handleNameChange}
              placeholder="Ex: Agência Stage Mídia"
              required
              minLength={2}
              maxLength={80}
              className="w-full px-4 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-600 text-cream-50 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cream-200 mb-1.5">
              Slug da organização
            </label>
            <div className="flex items-center rounded-lg bg-charcoal-800 border border-charcoal-600 overflow-hidden focus-within:ring-2 focus-within:ring-gold-500">
              <span className="px-3 text-charcoal-400 text-sm select-none">crm/</span>
              <input
                type="text"
                value={orgSlug}
                onChange={handleSlugChange}
                placeholder="agencia-stage"
                required
                minLength={2}
                maxLength={40}
                pattern="[a-z0-9-]+"
                className="flex-1 px-2 py-2.5 bg-transparent text-cream-50 placeholder-charcoal-400 focus:outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-charcoal-400">Apenas letras minúsculas, números e hifens.</p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-semibold transition-colors"
            >
              Próximo
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Timezone + Moeda */}
      {step === 2 && (
        <form onSubmit={handleNext} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-cream-200 mb-1.5">
              Fuso horário
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-600 text-cream-50 focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-cream-200 mb-1.5">
              Moeda padrão
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-600 text-cream-50 focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-2.5 rounded-lg border border-charcoal-600 text-cream-200 hover:bg-charcoal-800 transition-colors"
            >
              Voltar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-semibold transition-colors"
            >
              Próximo
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Integrações */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-cream-50 mb-2">Integrações disponíveis</h2>
            <p className="text-cream-400 text-sm mb-4">
              Conecte suas ferramentas depois de criar a organização. Todas as integrações ficam disponíveis nas configurações.
            </p>
            <ul className="space-y-2">
              {[
                'WhatsApp Business (via Evolution API)',
                'Meta Ads — importar campanhas e métricas',
                'Google Ads — importar campanhas',
                'Webhooks personalizados',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-cream-300">
                  <span className="w-4 h-4 rounded-full border border-charcoal-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-2.5 rounded-lg border border-charcoal-600 text-cream-200 hover:bg-charcoal-800 transition-colors"
            >
              Voltar
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="px-6 py-2.5 rounded-lg border border-charcoal-600 text-cream-200 hover:bg-charcoal-800 transition-colors disabled:opacity-50"
              >
                Pular
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="px-6 py-2.5 rounded-lg bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-semibold transition-colors disabled:opacity-50"
              >
                {isPending ? 'Criando...' : 'Criar organização'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
