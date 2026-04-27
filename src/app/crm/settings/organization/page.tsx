import { requireUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { updateOrg } from '@/lib/crm/organizations'

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

export default async function OrganizationSettingsPage() {
  const user = await requireUser()
  const supabase = createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_organization_id')
    .eq('id', user.id)
    .single()

  const organizationId = profile?.active_organization_id
  if (!organizationId) {
    return (
      <div className="p-8 text-cream-400">
        Nenhuma organização encontrada. <a href="/setup" className="text-gold-400 underline">Criar organização</a>
      </div>
    )
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug, timezone, currency, plan')
    .eq('id', organizationId)
    .single()

  if (!org) {
    return <div className="p-8 text-cream-400">Organização não encontrada.</div>
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-cream-50">Configurações da organização</h1>
        <p className="text-cream-400 text-sm mt-1">Edite as informações gerais da sua organização.</p>
      </div>

      <form action={async (formData: FormData) => { 'use server'; await updateOrg(formData) }} className="bg-charcoal-900 rounded-xl border border-charcoal-700 p-6 space-y-5">
        {/* Hidden org id */}
        <input type="hidden" name="id" value={org.id} />

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-cream-200 mb-1.5">
            Nome da organização
          </label>
          <input
            id="name"
            type="text"
            name="name"
            defaultValue={org.name}
            required
            minLength={2}
            maxLength={80}
            className="w-full px-4 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-600 text-cream-50 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>

        {/* Slug — read only */}
        <div>
          <label className="block text-sm font-medium text-cream-200 mb-1.5">
            Slug
          </label>
          <input
            type="text"
            value={org.slug}
            readOnly
            className="w-full px-4 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-charcoal-400 cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-charcoal-500">O slug não pode ser alterado após a criação.</p>
        </div>

        {/* Timezone */}
        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-cream-200 mb-1.5">
            Fuso horário
          </label>
          <select
            id="timezone"
            name="timezone"
            defaultValue={org.timezone ?? 'America/Sao_Paulo'}
            className="w-full px-4 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-600 text-cream-50 focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Currency */}
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-cream-200 mb-1.5">
            Moeda padrão
          </label>
          <select
            id="currency"
            name="currency"
            defaultValue={org.currency ?? 'BRL'}
            className="w-full px-4 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-600 text-cream-50 focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Plan — display only */}
        <div>
          <label className="block text-sm font-medium text-cream-200 mb-1.5">Plano</label>
          <div className="px-4 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 text-charcoal-300 capitalize">
            {org.plan ?? 'free'}
          </div>
          <p className="mt-1 text-xs text-charcoal-500">Para alterar o plano, entre em contato com o suporte.</p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-semibold transition-colors"
          >
            Salvar alterações
          </button>
        </div>
      </form>
    </div>
  )
}
