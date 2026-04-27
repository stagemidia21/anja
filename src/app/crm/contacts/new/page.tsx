import Link from 'next/link'
import { ContactForm } from '@/components/contacts/ContactForm'
import { listCustomFields } from '@/lib/crm/custom-fields'

export default async function NewContactPage() {
  const customFieldDefinitions = await listCustomFields('contact')
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/crm/contacts" className="text-cream/50 hover:text-cream text-sm">← Contatos</Link>
        <span className="text-cream/30">/</span>
        <h1 className="text-xl font-semibold text-cream">Novo contato</h1>
      </div>
      <ContactForm customFieldDefinitions={customFieldDefinitions} />
    </div>
  )
}
