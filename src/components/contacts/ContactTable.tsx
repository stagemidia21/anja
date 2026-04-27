'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

type Contact = {
  id: string
  full_name: string
  email?: string | null
  phone?: string | null
  job_title?: string | null
  tags: string[]
  created_at: string
}

type Props = {
  contacts: Contact[]
  count: number
  page: number
  perPage: number
}

export function ContactTable({ contacts, count, page, perPage }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const totalPages = Math.ceil(count / perPage)

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
                <Link href={sortLink('full_name')} className="hover:text-cream">Nome</Link>
              </th>
              <th className="text-left px-4 py-3">E-mail</th>
              <th className="text-left px-4 py-3">Telefone</th>
              <th className="text-left px-4 py-3">Cargo</th>
              <th className="text-left px-4 py-3">Tags</th>
              <th className="text-left px-4 py-3">
                <Link href={sortLink('created_at')} className="hover:text-cream">Criado</Link>
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-char-3">
            {contacts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-cream/40">
                  Nenhum contato encontrado.
                </td>
              </tr>
            )}
            {contacts.map((c) => (
              <tr key={c.id} className="hover:bg-char-2/50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/crm/contacts/${c.id}`} className="text-gold hover:underline font-medium">
                    {c.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-cream/70">{c.email ?? '—'}</td>
                <td className="px-4 py-3 text-cream/70">{c.phone ?? '—'}</td>
                <td className="px-4 py-3 text-cream/70">{c.job_title ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {c.tags.map((t) => (
                      <span key={t} className="bg-char-3 text-cream/70 text-xs px-2 py-0.5 rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-cream/50 text-xs">
                  {new Date(c.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/crm/contacts/${c.id}/duplicates`} className="text-xs text-cream/40 hover:text-gold transition-colors">
                    Duplicatas
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-cream/60">
          <span>{count} contatos</span>
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
      )}
    </div>
  )
}
