import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getContact, archiveContact } from '@/lib/crm/contacts'
import { Timeline } from '@/components/activities/Timeline'
import { ActivityComposer } from '@/components/activities/ActivityComposer'

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { types?: string }
}) {
  const contact = await getContact(params.id)
  if (!contact) notFound()

  const links = (contact as any).contact_company_links ?? []

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/crm/contacts" className="text-cream/50 hover:text-cream text-sm">
            ← Contatos
          </Link>
          <span className="text-cream/30">/</span>
          <h1 className="text-xl font-semibold text-cream">{contact.full_name}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/crm/contacts/${params.id}/edit`}
            className="border border-char-3 text-cream px-4 py-2 rounded-lg hover:border-gold text-sm transition-colors"
          >
            Editar
          </Link>
          <form action={async () => { 'use server'; await archiveContact(params.id) }}>
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
        <Field label="E-mail" value={contact.email} />
        <Field label="Telefone" value={contact.phone} />
        <Field label="CPF" value={contact.cpf} />
        <Field label="Cargo" value={contact.job_title} />
        <div className="col-span-2">
          <p className="text-xs text-cream/50 mb-1">Tags</p>
          <div className="flex gap-1 flex-wrap">
            {(contact.tags ?? []).length === 0 && <span className="text-cream/30 text-sm">—</span>}
            {(contact.tags ?? []).map((t: string) => (
              <span key={t} className="bg-char-3 text-cream/70 text-xs px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {links.length > 0 && (
        <div className="bg-char-2 border border-char-3 rounded-xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-cream/60 uppercase tracking-wider">Empresas</h2>
          {links.map((l: any) => (
            <div key={l.id} className="flex items-center gap-3">
              {l.is_primary && (
                <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full">Principal</span>
              )}
              <Link href={`/crm/companies/${l.companies.id}`} className="text-gold hover:underline">
                {l.companies.name}
              </Link>
              {l.role && <span className="text-cream/40 text-sm">· {l.role}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="bg-char-2 border border-char-3 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-cream/60 uppercase tracking-wider">Timeline</h2>
          <ActivityComposer subjectType="contact" subjectId={params.id} />
        </div>
        <Timeline subjectType="contact" subjectId={params.id} selectedTypes={parseTypes(searchParams?.types)} />
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-cream/50 mb-1">{label}</p>
      <p className="text-cream">{value ?? '—'}</p>
    </div>
  )
}

function parseTypes(raw?: string): string[] | undefined {
  if (!raw) return undefined
  const t = raw.split(',').map(s => s.trim()).filter(Boolean)
  return t.length ? t : undefined
}
