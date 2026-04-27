'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatBRL, formatDatePt } from '@/lib/format/brl'

type Row = {
  id: string
  title: string
  value: number | null
  expected_close_date: string | null
  outcome: 'won' | 'lost' | null
  tags: string[]
  created_at: string
  contact?: { id: string; full_name: string } | null
  company?: { id: string; name: string } | null
  stage?: { id: string; name: string; stage_type: string } | null
}

type Props = {
  rows: Row[]
  count: number
  page: number
  perPage: number
}

export function DealListTable({ rows, count, page, perPage }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const totalPages = Math.max(1, Math.ceil(count / perPage))

  function nav(newPage: number) {
    const p = new URLSearchParams(params.toString())
    p.set('page', String(newPage))
    router.push(`?${p.toString()}`)
  }

  function sortLink(col: string) {
    const p = new URLSearchParams(params.toString())
    const cur = p.get('sort')
    const dir = cur === col && p.get('dir') === 'asc' ? 'desc' : 'asc'
    p.set('sort', col)
    p.set('dir', dir)
    p.set('page', '1')
    return `?${p.toString()}`
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-char-3">
        <table className="w-full text-sm">
          <thead className="bg-char-2 text-cream/60">
            <tr>
              <th className="text-left px-4 py-3">
                <Link href={sortLink('title')} className="hover:text-cream">
                  Titulo
                </Link>
              </th>
              <th className="text-left px-4 py-3">Estagio</th>
              <th className="text-left px-4 py-3">
                <Link href={sortLink('value')} className="hover:text-cream">
                  Valor
                </Link>
              </th>
              <th className="text-left px-4 py-3">Contato</th>
              <th className="text-left px-4 py-3">
                <Link href={sortLink('expected_close_date')} className="hover:text-cream">
                  Prev.
                </Link>
              </th>
              <th className="text-left px-4 py-3">Tags</th>
              <th className="text-left px-4 py-3">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-char-3">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-cream/40">
                  Nenhum deal encontrado.
                </td>
              </tr>
            )}
            {rows.map((d) => (
              <tr key={d.id} className="hover:bg-char-2/50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/crm/deals/${d.id}`}
                    className="text-gold hover:underline font-medium"
                  >
                    {d.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-cream/70">{d.stage?.name ?? '—'}</td>
                <td className="px-4 py-3 text-cream/70">{formatBRL(d.value)}</td>
                <td className="px-4 py-3 text-cream/70">
                  {d.contact?.full_name ?? '—'}
                </td>
                <td className="px-4 py-3 text-cream/50 text-xs">
                  {formatDatePt(d.expected_close_date)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {d.tags.map((t) => (
                      <span
                        key={t}
                        className="bg-char-3 text-cream/70 text-xs px-2 py-0.5 rounded-full"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs">
                  {d.outcome === 'won' && <span className="text-emerald-400">Ganho</span>}
                  {d.outcome === 'lost' && <span className="text-red-400">Perdido</span>}
                  {!d.outcome && <span className="text-cream/40">Aberto</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-cream/60">
        <span>{count} deals</span>
        <div className="flex gap-2">
          <button
            onClick={() => nav(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 border border-char-3 rounded hover:border-gold disabled:opacity-40"
          >
            ←
          </button>
          <span className="px-3 py-1">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => nav(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 border border-char-3 rounded hover:border-gold disabled:opacity-40"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}
