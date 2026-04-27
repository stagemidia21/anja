import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCompany, archiveCompany } from '@/lib/crm/companies'
import { LinkedContactsPanel } from '@/components/companies/LinkedContactsPanel'

export default async function CompanyDetailPage({ params }: { params: { id: string } }) {
  const company = await getCompany(params.id)
  if (!company) notFound()

  const links = (company as any).contact_company_links ?? []

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/crm/companies" className="text-cream/50 hover:text-cream text-sm">
            ← Empresas
          </Link>
          <span className="text-cream/30">/</span>
          <h1 className="text-xl font-semibold text-cream">{company.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/crm/companies/${params.id}/edit`}
            className="border border-char-3 text-cream px-4 py-2 rounded-lg hover:border-gold text-sm transition-colors"
          >
            Editar
          </Link>
          <form action={async () => { 'use server'; await archiveCompany(params.id) }}>
            <button
              type="submit"
              className="border border-red-800/50 text-red-400 px-4 py-2 rounded-lg hover:border-red-600 text-sm transition-colors"
            >
              Arquivar
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 bg-char-2 border border-char-3 rounded-xl p-6">
        <Field label="Domínio" value={company.domain} />
        <Field label="CNPJ" value={company.cnpj} />
        <Field label="Setor" value={company.industry} />
        <Field label="Porte" value={company.size} />
        <div className="col-span-2">
          <p className="text-xs text-cream/50 mb-1">Tags</p>
          <div className="flex gap-1 flex-wrap">
            {(company.tags ?? []).length === 0 && <span className="text-cream/30 text-sm">—</span>}
            {(company.tags ?? []).map((t: string) => (
              <span key={t} className="bg-char-3 text-cream/70 text-xs px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-char-2 border border-char-3 rounded-xl p-6">
        <LinkedContactsPanel companyId={params.id} links={links} />
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-cream/50 mb-1">{label}</p>
      <p className="text-cream capitalize">{value ?? '—'}</p>
    </div>
  )
}
