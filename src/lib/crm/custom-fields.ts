'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrg } from '@/lib/auth/require-org'
import { CustomFieldDefinitionSchema, type CustomFieldDefinition } from '@/lib/validations/custom-field'

type ActionResult<T = { id: string }> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

function mapFieldErrors(zodError: unknown): Record<string, string[]> {
  const anyErr = zodError as { issues?: Array<{ path: (string | number)[]; message: string }> }
  const out: Record<string, string[]> = {}
  for (const issue of anyErr.issues ?? []) {
    const key = issue.path.join('.') || '_'
    out[key] = [...(out[key] ?? []), issue.message]
  }
  return out
}

export async function listCustomFields(scope?: 'contact' | 'company'): Promise<CustomFieldDefinition[]> {
  await requireOrg()
  const supabase = createClient()
  let q = supabase
    .from('custom_field_definitions')
    .select('id, scope, key, label, type, options, required, position, archived_at')
    .is('archived_at', null)
    .order('position', { ascending: true })
  if (scope) q = (q as any).eq('scope', scope)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((d: any) => ({ ...d, field_type: d.type })) as CustomFieldDefinition[]
}

function parseFormDef(formData: FormData) {
  const raw = Object.fromEntries(formData)
  let options: { value: string; label: string }[] = []
  try { options = JSON.parse(String(raw.options ?? '[]')) } catch { options = [] }
  return {
    id: raw.id ? String(raw.id) : undefined,
    scope: raw.scope,
    key: raw.key,
    label: raw.label,
    field_type: raw.field_type,
    options,
    required: raw.required === 'on' || raw.required === 'true',
    position: raw.position ?? 0,
  }
}

export async function createCustomField(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const { organizationId } = await requireOrg()
  const parsed = CustomFieldDefinitionSchema.safeParse(parseFormDef(formData))
  if (!parsed.success) return { ok: false, error: 'validation_error', fieldErrors: mapFieldErrors(parsed.error) }

  const supabase = createClient()
  const { field_type, id: _id, ...rest } = parsed.data
  const { data, error } = await supabase
    .from('custom_field_definitions')
    .insert({ ...rest, type: field_type, organization_id: organizationId })
    .select('id')
    .single()

  if (error) {
    if (error.code === 'P0001' || /max_custom_fields_exceeded/i.test(error.message)) {
      return { ok: false, error: 'limit_reached' }
    }
    if (error.code === '23505') return { ok: false, error: 'key_already_exists' }
    return { ok: false, error: error.message }
  }
  revalidatePath('/crm/settings/custom-fields')
  return { ok: true, data: { id: data.id } }
}

export async function updateCustomField(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const { organizationId } = await requireOrg()
  const parsed = CustomFieldDefinitionSchema.safeParse(parseFormDef(formData))
  if (!parsed.success || !parsed.data.id) {
    return { ok: false, error: 'validation_error', fieldErrors: parsed.success ? { id: ['obrigatório'] } : mapFieldErrors(parsed.error) }
  }
  const { id, field_type, ...rest } = parsed.data
  const supabase = createClient()
  const { error } = await supabase
    .from('custom_field_definitions')
    .update({ ...rest, type: field_type })
    .eq('id', id!)
    .eq('organization_id', organizationId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/crm/settings/custom-fields')
  return { ok: true, data: { id: id! } }
}

export async function archiveCustomField(id: string): Promise<ActionResult> {
  const { organizationId } = await requireOrg()
  const supabase = createClient()
  const { error } = await supabase
    .from('custom_field_definitions')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/crm/settings/custom-fields')
  return { ok: true, data: { id } }
}
