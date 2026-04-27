import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getContact } from '@/lib/crm/contacts'
import { detectContactDuplicates } from '@/lib/crm/duplicates'
import { MergeLauncher } from './MergeLauncher'

export default async function ContactDuplicatesPage({ params }: { params: { id: string } }) {
  const [contact, duplicates] = await Promise.all([
    getContact(params.id),
    detectContactDuplicates(params.id),
  ])
  if (!contact) notFound()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/crm/contacts/${params.id}`} className="text-cream/50 hover:text-cream text-sm">
          ← {contact.full_name}
        </Link>
        <span className="text-cream/30">/</span>
        <h1 className="text-xl font-semibold text-cream">Duplicatas</h1>
      </div>

      <p className="text-sm text-cream/60">
        {duplicates.length > 0
          ? `${duplicates.length} possível${duplicates.length > 1 ? 'is duplicata' : ' duplicata'} encontrada${duplicates.length > 1 ? 's' : ''}.`
          : 'Sem duplicatas detectadas.'}
      </p>

      <MergeLauncher contact={contact as any} duplicates={duplicates} />
    </div>
  )
}
