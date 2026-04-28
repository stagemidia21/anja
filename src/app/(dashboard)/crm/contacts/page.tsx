import Link from 'next/link'
import { listContacts } from '@/lib/crm/contacts'
import { ContactTable } from '@/components/contacts/ContactTable'

type SearchParams = {
  page?: string
  sort?: string
  dir?: string
  owner?: string
  tag?: string
}

export default async function ContactsPage({ searchParams }: { searchParams: SearchParams }) {
  const page = Number(searchParams.page ?? 1)
  const perPage = 25

  const { data, count } = await listContacts({
    page,
    perPage,
    sortBy: (searchParams.sort as any) ?? 'created_at',
    sortDir: (searchParams.dir as any) ?? 'desc',
    ownerId: searchParams.owner,
    tag: searchParams.tag,
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-cream">Contatos</h1>
          <p className="text-cream/50 text-sm">{count} no total</p>
        </div>
        <Link
          href="/crm/contacts/new"
          className="bg-gold text-charcoal font-semibold px-4 py-2 rounded-lg hover:bg-gold/90 text-sm transition-colors"
        >
          + Novo contato
        </Link>
      </div>

      <ContactTable contacts={data} count={count} page={page} perPage={perPage} />
    </div>
  )
}
