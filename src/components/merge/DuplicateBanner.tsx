'use client'
import Link from 'next/link'

type Props = {
  duplicate: {
    id?: string
    full_name?: string
    name?: string
    reason: string
  }
  contactId?: string
}

const REASON_LABEL: Record<string, string> = {
  email: 'mesmo e-mail',
  phone: 'mesmo telefone',
  cnpj: 'mesmo CNPJ',
  name: 'nome similar',
  domain: 'mesmo domínio',
}

export function DuplicateBanner({ duplicate, contactId }: Props) {
  const label = duplicate.full_name ?? duplicate.name ?? 'registro existente'
  const reason = REASON_LABEL[duplicate.reason] ?? duplicate.reason

  return (
    <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300 space-y-1">
      <p className="font-semibold">Possível duplicata detectada</p>
      <p>
        Já existe um registro com {reason}:{' '}
        {duplicate.id ? (
          <Link href={`/crm/contacts/${duplicate.id}`} className="underline hover:text-yellow-100">
            {label}
          </Link>
        ) : (
          <span className="font-medium">{label}</span>
        )}
      </p>
      {contactId && duplicate.id && (
        <Link
          href={`/crm/contacts/${contactId}/duplicates?merge_with=${duplicate.id}`}
          className="inline-block mt-1 text-xs bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 px-3 py-1 rounded transition-colors"
        >
          Mesclar registros →
        </Link>
      )}
    </div>
  )
}
