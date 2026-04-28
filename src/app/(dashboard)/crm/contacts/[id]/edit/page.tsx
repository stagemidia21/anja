import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getContact } from '@/lib/crm/contacts'
import { ContactForm } from '@/components/contacts/ContactForm'
import { listCustomFields } from '@/lib/crm/custom-fields'

export default async function EditContactPage({ params }: { params: { id: string } }) {
  const [contact, customFieldDefinitions] = await Promise.all([
    getContact(params.id),
    listCustomFields('contact'),
  ])
  if (!contact) notFound()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/crm/contacts/${params.id}`} className="text-cream/50 hover:text-cream text-sm">
          ← {contact.full_name}
        </Link>
        <span className="text-cream/30">/</span>
        <h1 className="text-xl font-semibold text-cream">Editar contato</h1>
      </div>
      <ContactForm contact={contact as any} customFieldDefinitions={customFieldDefinitions} />
    </div>
  )
}
