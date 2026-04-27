'use client'
import { useState } from 'react'
import Link from 'next/link'
import { unlinkContact, setPrimaryContact } from '@/lib/crm/companies'

type LinkedContact = {
  id: string
  role: string | null
  is_primary: boolean
  contacts: {
    id: string
    full_name: string
    email?: string | null
    phone?: string | null
    job_title?: string | null
  }
}

type Props = {
  companyId: string
  links: LinkedContact[]
}

export function LinkedContactsPanel({ companyId, links }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleUnlink(contactId: string) {
    setLoading(contactId)
    await unlinkContact(companyId, contactId)
    setLoading(null)
  }

  async function handleSetPrimary(contactId: string) {
    setLoading(contactId + '_primary')
    await setPrimaryContact(companyId, contactId)
    setLoading(null)
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-cream/60 uppercase tracking-wider">
        Contatos vinculados
      </h3>

      {links.length === 0 && (
        <p className="text-cream/40 text-sm">Nenhum contato vinculado.</p>
      )}

      <div className="space-y-2">
        {links.map((link) => (
          <div
            key={link.contacts.id}
            className="flex items-center justify-between bg-char-2 rounded-lg px-4 py-3 border border-char-3"
          >
            <div className="flex items-center gap-3">
              {link.is_primary && (
                <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full">
                  Principal
                </span>
              )}
              <div>
                <Link
                  href={`/crm/contacts/${link.contacts.id}`}
                  className="text-cream font-medium hover:text-gold"
                >
                  {link.contacts.full_name}
                </Link>
                {link.role && (
                  <span className="text-cream/50 text-sm ml-2">· {link.role}</span>
                )}
                {link.contacts.email && (
                  <p className="text-cream/50 text-xs">{link.contacts.email}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {!link.is_primary && (
                <button
                  onClick={() => handleSetPrimary(link.contacts.id)}
                  disabled={loading === link.contacts.id + '_primary'}
                  className="text-xs text-cream/50 hover:text-gold border border-char-3 px-2 py-1 rounded disabled:opacity-40"
                >
                  Definir principal
                </button>
              )}
              <button
                onClick={() => handleUnlink(link.contacts.id)}
                disabled={loading === link.contacts.id}
                className="text-xs text-red-400/70 hover:text-red-400 border border-char-3 px-2 py-1 rounded disabled:opacity-40"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
