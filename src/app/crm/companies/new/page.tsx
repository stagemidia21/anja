import Link from 'next/link'
import { CompanyForm } from '@/components/companies/CompanyForm'
import { listCustomFields } from '@/lib/crm/custom-fields'

export default async function NewCompanyPage() {
  const customFieldDefinitions = await listCustomFields('company')
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/crm/companies" className="text-cream/50 hover:text-cream text-sm">← Empresas</Link>
        <span className="text-cream/30">/</span>
        <h1 className="text-xl font-semibold text-cream">Nova empresa</h1>
      </div>
      <CompanyForm customFieldDefinitions={customFieldDefinitions} />
    </div>
  )
}
