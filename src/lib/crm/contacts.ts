'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrg } from '@/lib/auth/require-org'
import { contactSchema } from '@/lib/validations/contact'
import { normalizePhone } from '@/lib/phone'
import { stripMask } from '@/lib/cpf-cnpj'

export type ListContactsParams = {
  page?: number
  perPage?: number
  sortBy?: 'full_name' | 'created_at'
  sortDir?: 'asc' | 'desc'
  ownerId?: string
  tag?: string
  search?: string
}

export async function listContacts(params: ListContactsParams = {}) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()
  const { page = 1, perPage = 25, sortBy = 'created_at', sortDir = 'desc', ownerId, tag } = params

  let q = supabase
    .from('contacts')
    .select('id, full_name, email, phone, job_title, tags, owner_id, created_at', { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('archived_at', null)
    .order(sortBy, { ascending: sortDir === 'asc' })
    .range((page - 1) * perPage, page * perPage - 1)

  if (ownerId) q = q.eq('owner_id', ownerId)
  if (tag) q = q.contains('tags', [tag])

  const { data, count, error } = await q
  if (error) return { data: [], count: 0, error: error.message }
  return { data: data ?? [], count: count ?? 0 }
}

export async function getContact(id: string) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const { data, error } = await supabase
    .from('contacts')
    .select(`
      *,
      contact_company_links(
        id, role, is_primary,
        companies(id, name, domain)
      )
    `)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  if (error) return null
  return data
}

export async function createContact(formData: FormData) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const raw = {
    full_name: formData.get('full_name') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string,
    cpf: formData.get('cpf') as string,
    job_title: formData.get('job_title') as string,
    tags: (formData.get('tags') as string ?? '').split(',').map(t => t.trim()).filter(Boolean),
    owner_id: formData.get('owner_id') as string,
  }

  const parsed = contactSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const phoneFields = parsed.data.phone ? normalizePhone(parsed.data.phone) : null
  const cpfClean = parsed.data.cpf ? stripMask(parsed.data.cpf) : null

  const { data, error } = await supabase.from('contacts').insert({
    organization_id: organizationId,
    full_name: parsed.data.full_name,
    email: parsed.data.email || null,
    phone: phoneFields?.phone ?? null,
    phone_e164: phoneFields?.phone_e164 ?? null,
    cpf: cpfClean || null,
    job_title: parsed.data.job_title || null,
    tags: parsed.data.tags,
    owner_id: parsed.data.owner_id || null,
  }).select().single()

  if (error) {
    if (error.message.includes('uq_contacts_email_org')) {
      const { data: existing } = await supabase
        .from('contacts')
        .select('id, full_name')
        .eq('organization_id', organizationId)
        .eq('email', parsed.data.email!)
        .is('archived_at', null)
        .single()
      return { error: 'duplicate_found', duplicate: { id: existing?.id, full_name: existing?.full_name, reason: 'email' as const } }
    }
    if (error.message.includes('uq_contacts_phone_org')) {
      const { data: existing } = await supabase
        .from('contacts')
        .select('id, full_name')
        .eq('organization_id', organizationId)
        .eq('phone_e164', phoneFields?.phone_e164!)
        .is('archived_at', null)
        .single()
      return { error: 'duplicate_found', duplicate: { id: existing?.id, full_name: existing?.full_name, reason: 'phone' as const } }
    }
    return { error: error.message }
  }

  revalidatePath('/crm/contacts')
  return { data }
}

export async function updateContact(id: string, formData: FormData) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const raw = {
    full_name: formData.get('full_name') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string,
    cpf: formData.get('cpf') as string,
    job_title: formData.get('job_title') as string,
    tags: (formData.get('tags') as string ?? '').split(',').map(t => t.trim()).filter(Boolean),
    owner_id: formData.get('owner_id') as string,
  }

  const parsed = contactSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const phoneFields = parsed.data.phone ? normalizePhone(parsed.data.phone) : null
  const cpfClean = parsed.data.cpf ? stripMask(parsed.data.cpf) : null

  const { error } = await supabase
    .from('contacts')
    .update({
      full_name: parsed.data.full_name,
      email: parsed.data.email || null,
      phone: phoneFields?.phone ?? null,
      phone_e164: phoneFields?.phone_e164 ?? null,
      cpf: cpfClean || null,
      job_title: parsed.data.job_title || null,
      tags: parsed.data.tags,
      owner_id: parsed.data.owner_id || null,
    })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    if (error.message.includes('uq_contacts_email_org')) {
      const { data: existing } = await supabase
        .from('contacts')
        .select('id, full_name')
        .eq('organization_id', organizationId)
        .eq('email', parsed.data.email!)
        .is('archived_at', null)
        .neq('id', id)
        .single()
      return { error: 'duplicate_found', duplicate: { id: existing?.id, full_name: existing?.full_name, reason: 'email' as const } }
    }
    if (error.message.includes('uq_contacts_phone_org')) {
      const { data: existing } = await supabase
        .from('contacts')
        .select('id, full_name')
        .eq('organization_id', organizationId)
        .eq('phone_e164', phoneFields?.phone_e164!)
        .is('archived_at', null)
        .neq('id', id)
        .single()
      return { error: 'duplicate_found', duplicate: { id: existing?.id, full_name: existing?.full_name, reason: 'phone' as const } }
    }
    return { error: error.message }
  }
  revalidatePath(`/crm/contacts/${id}`)
  revalidatePath('/crm/contacts')
  return { success: true }
}

export async function archiveContact(id: string) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const { error } = await supabase
    .from('contacts')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }
  revalidatePath('/crm/contacts')
  return { success: true }
}
