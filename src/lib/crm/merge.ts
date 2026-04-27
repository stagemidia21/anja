'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrg } from '@/lib/auth/require-org'

export type MergeContactOverrides = {
  full_name?: string
  email?: string
  phone?: string
  job_title?: string
  tags?: string[]
}

export async function mergeContacts(
  sourceId: string,
  targetId: string,
  overrides?: MergeContactOverrides
) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  if (overrides && Object.keys(overrides).length > 0) {
    const { error: overrideErr } = await supabase
      .from('contacts')
      .update(overrides)
      .eq('id', targetId)
      .eq('organization_id', organizationId)
    if (overrideErr) return { error: overrideErr.message }
  }

  const { error } = await supabase.rpc('merge_contacts', {
    source_id: sourceId,
    target_id: targetId,
  })

  if (error) return { error: error.message }

  revalidatePath('/crm/contacts')
  revalidatePath(`/crm/contacts/${targetId}`)
  return { success: true, survivorId: targetId }
}

export type MergeCompanyOverrides = {
  name?: string
  domain?: string
  industry?: string
  size?: string
  tags?: string[]
}

export async function mergeCompanies(
  sourceId: string,
  targetId: string,
  overrides?: MergeCompanyOverrides
) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const [{ data: source }, { data: target }] = await Promise.all([
    supabase.from('companies').select('*').eq('id', sourceId).eq('organization_id', organizationId).single(),
    supabase.from('companies').select('*').eq('id', targetId).eq('organization_id', organizationId).single(),
  ])

  if (!source || !target) return { error: 'Empresa não encontrada.' }

  // Move contact links from source to target (skip duplicates)
  const { data: sourceLinks } = await supabase
    .from('contact_company_links')
    .select('contact_id, role, is_primary')
    .eq('company_id', sourceId)

  const { data: targetLinks } = await supabase
    .from('contact_company_links')
    .select('contact_id')
    .eq('company_id', targetId)

  const existingContactIds = new Set((targetLinks ?? []).map((l) => l.contact_id))

  for (const link of sourceLinks ?? []) {
    if (!existingContactIds.has(link.contact_id)) {
      await supabase.from('contact_company_links').insert({
        company_id: targetId,
        contact_id: link.contact_id,
        organization_id: organizationId,
        role: link.role,
        is_primary: false,
      })
    }
  }

  // Merge tags
  const mergedTags = Array.from(new Set([...(source.tags ?? []), ...(target.tags ?? [])]))

  const { error: updateErr } = await supabase
    .from('companies')
    .update({
      tags: mergedTags,
      ...overrides,
    })
    .eq('id', targetId)
    .eq('organization_id', organizationId)

  if (updateErr) return { error: updateErr.message }

  // Soft-delete source
  const { error: archiveErr } = await supabase
    .from('companies')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', sourceId)
    .eq('organization_id', organizationId)

  if (archiveErr) return { error: archiveErr.message }

  // Remove old links from source
  await supabase.from('contact_company_links').delete().eq('company_id', sourceId)

  revalidatePath('/crm/companies')
  revalidatePath(`/crm/companies/${targetId}`)
  return { success: true, survivorId: targetId }
}
