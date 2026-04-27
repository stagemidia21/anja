import { listCustomFields } from '@/lib/crm/custom-fields'
import { CustomFieldAdmin } from '@/components/custom-fields/CustomFieldAdmin'

export default async function CustomFieldsPage() {
  const definitions = await listCustomFields()
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-cream">Campos personalizados</h1>
        <p className="text-sm text-cream/50">Até 15 campos por escopo. Aparecem automaticamente nos formulários.</p>
      </div>
      <CustomFieldAdmin initialDefinitions={definitions} />
    </div>
  )
}
