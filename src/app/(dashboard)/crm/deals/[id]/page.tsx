import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDeal } from '@/lib/crm/deals'
import { formatBRL, formatDatePt } from '@/lib/format/brl'
import { DealDetailActions } from './DealDetailActions'
import { Timeline } from '@/components/activities/Timeline'
import { ActivityComposer } from '@/components/activities/ActivityComposer'

export default async function DealDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { types?: string }
}) {
  const deal = await getDeal(params.id)
  if (!deal) notFound()

  const stage = (deal as any).stage
  const contact = (deal as any).contact
  const company = (deal as any).company
  const pipeline = (deal as any).pipeline
  const committee = ((deal as any).deal_contacts ?? []) as {
    contact_id: string
    role: string | null
    is_primary: boolean
    contacts: { id: string; full_name: string; email: string | null }
  }[]

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold text-cream">{(deal as any).title}</h1>
          <p className="text-cream/50 text-sm">
            {pipeline?.name} · {stage?.name}
            {(deal as any).outcome === 'won' && <span className="ml-2 text-emerald-400">(Ganho)</span>}
            {(deal as any).outcome === 'lost' && <span className="ml-2 text-red-400">(Perdido)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/crm/deals/${(deal as any).id}/edit`}
            className="px-4 py-2 rounded-lg border border-char-3 hover:border-gold text-cream/80 text-sm"
          >
            Editar
          </Link>
          <DealDetailActions
            dealId={(deal as any).id}
            disabled={!!(deal as any).outcome}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 bg-char-2 border border-char-3 rounded-lg p-4">
        <Field label="Valor" value={formatBRL((deal as any).value)} />
        <Field label="Data prevista" value={formatDatePt((deal as any).expected_close_date)} />
        <Field label="Contato primario" value={contact?.full_name ?? '—'} />
        <Field label="Empresa" value={company?.name ?? '—'} />
        <Field
          label="Probabilidade"
          value={stage?.default_probability != null ? `${stage.default_probability}%` : '—'}
        />
        <Field label="Ultimo activity" value={formatDatePt((deal as any).last_activity_at)} />
        {(deal as any).outcome && (
          <>
            <Field label="Fechado em" value={formatDatePt((deal as any).closed_at)} />
            <Field label="Motivo" value={(deal as any).close_reason ?? '—'} />
          </>
        )}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-cream/70 uppercase tracking-wider">Comite de compra</h2>
        {committee.length === 0 && (
          <p className="text-cream/50 text-sm">Nenhum contato vinculado alem do primario.</p>
        )}
        {committee.map((c) => (
          <div
            key={c.contact_id}
            className="flex items-center justify-between bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-sm"
          >
            <div>
              <span className="text-cream">{c.contacts.full_name}</span>
              {c.role && <span className="text-cream/50 ml-2">({c.role})</span>}
              {c.is_primary && <span className="text-gold ml-2">· primario</span>}
            </div>
            <span className="text-cream/50 text-xs">{c.contacts.email ?? ''}</span>
          </div>
        ))}
      </section>

      <div className="bg-char-2 border border-char-3 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-cream/60 uppercase tracking-wider">Timeline</h2>
          <ActivityComposer subjectType="deal" subjectId={params.id} />
        </div>
        <Timeline subjectType="deal" subjectId={params.id} selectedTypes={parseTypes(searchParams?.types)} />
      </div>

      <div>
        <Link href="/crm/pipeline" className="text-sm text-cream/60 hover:text-gold">
          ← Voltar ao pipeline
        </Link>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-cream/50">{label}</div>
      <div className="text-cream text-sm">{value}</div>
    </div>
  )
}

function parseTypes(raw?: string): string[] | undefined {
  if (!raw) return undefined
  const t = raw.split(',').map(s => s.trim()).filter(Boolean)
  return t.length ? t : undefined
}
