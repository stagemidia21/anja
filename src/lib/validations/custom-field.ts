import { z } from 'zod'

const KEY_REGEX = /^[a-z][a-z0-9_]{0,49}$/

export const FIELD_TYPES = ['text', 'number', 'date', 'select', 'multiselect', 'boolean'] as const
export type CustomFieldType = (typeof FIELD_TYPES)[number]

export const CustomFieldOptionSchema = z.object({
  value: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
})

export const CustomFieldDefinitionSchema = z.object({
  id: z.string().uuid().optional(),
  scope: z.enum(['contact', 'company']),
  key: z.string().trim().min(2).max(50).regex(KEY_REGEX, 'Use snake_case (letras minúsculas, números, underscore — começando com letra)'),
  label: z.string().trim().min(1).max(60),
  field_type: z.enum(FIELD_TYPES),
  options: z.array(CustomFieldOptionSchema).default([]),
  required: z.coerce.boolean().default(false),
  position: z.coerce.number().int().min(0).max(999).default(0),
}).refine(
  (d) => (['select', 'multiselect'].includes(d.field_type) ? d.options.length > 0 : true),
  { message: 'Tipos select/multiselect precisam de pelo menos uma opção', path: ['options'] }
)

export type CustomFieldDefinition = z.infer<typeof CustomFieldDefinitionSchema>

export function buildCustomFieldsValueSchema(defs: CustomFieldDefinition[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const d of defs) {
    let s: z.ZodTypeAny
    switch (d.field_type) {
      case 'text':    s = z.string().trim().max(2000); break
      case 'number':  s = z.coerce.number(); break
      case 'date':    s = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser YYYY-MM-DD'); break
      case 'boolean': s = z.coerce.boolean(); break
      case 'select': {
        const vals = d.options.map((o) => o.value) as [string, ...string[]]
        s = z.enum(vals)
        break
      }
      case 'multiselect': {
        const vals = d.options.map((o) => o.value) as [string, ...string[]]
        s = z.array(z.enum(vals))
        break
      }
    }
    shape[d.key] = d.required ? s! : s!.optional().or(z.literal('').transform(() => undefined))
  }
  return z.object(shape).passthrough()
}
