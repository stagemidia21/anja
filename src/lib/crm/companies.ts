'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrg } from '@/lib/auth/require-org'
import { companySchema } from '@/lib/validations/company'
import { stripMask } from '@/lib/cpf-cnpj'

export type ListCompaniesParams = {
  page?: number
  perPage?: number
  sortBy?: 'name' | 'created_at'
  sortDir?: 'asc' | 'desc'
  industry?: string
  size?: string
  tag?: string
}

export async function listCompanies(params: ListCompaniesParams = {}) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()
  const { page = 1, perPage = 25, sortBy = 'created_at', sortDir = 'desc', industry, size, tag } = params

  let q = supabase
    .from('companies')
    .select('id, name, domain, cnpj, industry, size, tags, created_at', { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('archived_at', null)
    .order(sortBy, { ascending: sortDir === 'asc' })
    .range((page - 1) * perPage, page * perPage - 1)

  if (industry) q = q.eq('industry', industry)
  if (size) q = q.eq('size', size)
  if (tag) q = q.contains('tags', [tag])

  const { data, count, error } = await q
  if (error) return { data: [], count: 0, error: error.message }
  return { data: data ?? [], count: count ?? 0 }
}

export async function getCompany(id: string) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const { data, error } = await supabase
    .from('companies')
    .select(`
      *,
      contact_company_links(
        id, role, is_primary,
        contacts(id, full_name, email, phone, job_title)
      )
    `)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  if (error) return null
  return data
}

export async function createCompany(formData: FormData) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const raw = {
    name: formData.get('name') as string,
    domain: formData.get('domain') as string,
    cnpj: formData.get('cnpj') as string,
    industry: formData.get('industry') as string,
    size: formData.get('size') as string || undefined,
    tags: (formData.get('tags') as string ?? '').split(',').map(t => t.trim()).filter(Boolean),
    owner_id: formData.get('owner_id') as string,
  }

  const parsed = companySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const cnpjClean = parsed.data.cnpj ? stripMask(parsed.data.cnpj) : null

  const { data, error } = await supabase.from('companies').insert({
    organization_id: organizationId,
    name: parsed.data.name,
    domain: parsed.data.domain || null,
    cnpj: cnpjClean || null,
    industry: parsed.data.industry || null,
    size: parsed.data.size || null,
    tags: parsed.data.tags,
    owner_id: parsed.data.owner_id || null,
  }).select().single()

  if (error) {
    if (error.message.includes('uq_companies_cnpj_org')) {
      const { data: existing } = await supabase
        .from('companies')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('cnpj', cnpjClean!)
        .is('archived_at', null)
        .single()
      return { error: 'duplicate_found', duplicate: { id: existing?.id, name: existing?.name, reason: 'cnpj' as const } }
    }
    return { error: error.message }
  }

  revalidatePath('/crm/companies')
  return { data }
}

export async function updateCompany(id: string, formData: FormData) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const raw = {
    name: formData.get('name') as string,
    domain: formData.get('domain') as string,
    cnpj: formData.get('cnpj') as string,
    industry: formData.get('industry') as string,
    size: formData.get('size') as string || undefined,
    tags: (formData.get('tags') as string ?? '').split(',').map(t => t.trim()).filter(Boolean),
    owner_id: formData.get('owner_id') as string,
  }

  const parsed = companySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const cnpjClean = parsed.data.cnpj ? stripMask(parsed.data.cnpj) : null

  const { error } = await supabase
    .from('companies')
    .update({
      name: parsed.data.name,
      domain: parsed.data.domain || null,
      cnpj: cnpjClean || null,
      industry: parsed.data.industry || null,
      size: parsed.data.size || null,
      tags: parsed.data.tags,
      owner_id: parsed.data.owner_id || null,
    })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }
  revalidatePath(`/crm/companies/${id}`)
  revalidatePath('/crm/companies')
  return { success: true }
}

export async function archiveCompany(id: string) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const { error } = await supabase
    .from('companies')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }
  revalidatePath('/crm/companies')
  return { success: true }
}

export async function linkContact(
  companyId: string,
  contactId: string,
  role?: string,
  isPrimary?: boolean
) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const { error } = await supabase.from('contact_company_links').insert({
    organization_id: organizationId,
    company_id: companyId,
    contact_id: contactId,
    role: role || null,
    is_primary: isPrimary ?? false,
  })

  if (error) return { error: error.message }
  revalidatePath(`/crm/companies/${companyId}`)
  return { success: true }
}

export async function unlinkContact(companyId: string, contactId: string) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const { error } = await supabase
    .from('contact_company_links')
    .delete()
    .eq('company_id', companyId)
    .eq('contact_id', contactId)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }
  revalidatePath(`/crm/companies/${companyId}`)
  return { success: true }
}

export async function setPrimaryContact(companyId: string, contactId: string) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  await supabase
    .from('contact_company_links')
    .update({ is_primary: false })
    .eq('company_id', companyId)
    .eq('organization_id', organizationId)

  const { error } = await supabase
    .from('contact_company_links')
    .update({ is_primary: true })
    .eq('company_id', companyId)
    .eq('contact_id', contactId)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }
  revalidatePath(`/crm/companies/${companyId}`)
  return { success: true }
}
