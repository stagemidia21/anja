'use client'
import type { CustomFieldDefinition } from '@/lib/validations/custom-field'

export function DynamicFieldRenderer({ def, value }: { def: CustomFieldDefinition; value?: unknown }) {
  const name = `custom_fields.${def.key}`
  const base = 'w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold'

  const label = (
    <label className="block text-sm text-cream/70 mb-1">
      {def.label}{def.required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  )

  switch (def.field_type) {
    case 'text':
      return <div>{label}<input name={name} defaultValue={value ? String(value) : ''} required={def.required} className={base} /></div>
    case 'number':
      return <div>{label}<input name={name} type="number" defaultValue={value !== undefined ? String(value) : ''} required={def.required} className={base} /></div>
    case 'date':
      return <div>{label}<input name={name} type="date" defaultValue={value ? String(value) : ''} required={def.required} className={base} /></div>
    case 'boolean':
      return (
        <label className="flex items-center gap-2 text-sm text-cream/70 cursor-pointer">
          <input name={name} type="checkbox" defaultChecked={Boolean(value)} className="rounded border-char-3" />
          {def.label}
        </label>
      )
    case 'select':
      return (
        <div>
          {label}
          <select name={name} defaultValue={value ? String(value) : ''} required={def.required} className={base}>
            <option value="">—</option>
            {def.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )
    case 'multiselect': {
      const arr: string[] = Array.isArray(value) ? value.map(String) : []
      return (
        <div>
          {label}
          <div className="space-y-1 rounded-lg border border-char-3 bg-char-2 p-2">
            {def.options.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm text-cream/70 cursor-pointer">
                <input type="checkbox" name={name} value={o.value} defaultChecked={arr.includes(o.value)} />
                {o.label}
              </label>
            ))}
          </div>
        </div>
      )
    }
  }
}
