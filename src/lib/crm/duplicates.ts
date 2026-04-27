'use server'
import { createClient } from '@/lib/supabase/server'
import { requireOrg } from '@/lib/auth/require-org'

export type ContactDuplicate = {
  id: string
  full_name: string
  email?: string | null
  phone?: string | null
  job_title?: string | null
  reason: 'email' | 'phone' | 'name'
}

export type CompanyDuplicate = {
  id: string
  name: string
  domain?: string | null
  cnpj?: string | null
  reason: 'cnpj' | 'domain' | 'name'
}

export async function detectContactDuplicates(contactId: string): Promise<ContactDuplicate[]> {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const { data: contact } = await supabase
    .from('contacts')
    .select('full_name, email, phone_e164')
    .eq('id', contactId)
    .eq('organization_id', organizationId)
    .single()

  if (!contact) return []

  const results: ContactDuplicate[] = []
  const seen = new Set<string>()

  // Exact email match
  if (contact.email) {
    const { data } = await supabase
      .from('contacts')
      .select('id, full_name, email, phone, job_title')
      .eq('organization_id', organizationId)
      .eq('email', contact.email)
      .is('archived_at', null)
      .neq('id', contactId)
    for (const c of data ?? []) {
      if (!seen.has(c.id)) { seen.add(c.id); results.push({ ...c, reason: 'email' }) }
    }
  }

  // Exact phone match
  if (contact.phone_e164) {
    const { data } = await supabase
      .from('contacts')
      .select('id, full_name, email, phone, job_title')
      .eq('organization_id', organizationId)
      .eq('phone_e164', contact.phone_e164)
      .is('archived_at', null)
      .neq('id', contactId)
    for (const c of data ?? []) {
      if (!seen.has(c.id)) { seen.add(c.id); results.push({ ...c, reason: 'phone' }) }
    }
  }

  // Fuzzy name match via trigram RPC
  if (contact.full_name) {
    const { data } = await supabase
      .from('contacts')
      .select('id, full_name, email, phone, job_title')
      .eq('organization_id', organizationId)
      .is('archived_at', null)
      .neq('id', contactId)
      .ilike('full_name', `%${contact.full_name.split(' ')[0]}%`)
    for (const c of data ?? []) {
      if (!seen.has(c.id)) { seen.add(c.id); results.push({ ...c, reason: 'name' }) }
    }
  }

  return results
}

export async function detectCompanyDuplicates(companyId: string): Promise<CompanyDuplicate[]> {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const { data: company } = await supabase
    .from('companies')
    .select('name, domain, cnpj')
    .eq('id', companyId)
    .eq('organization_id', organizationId)
    .single()

  if (!company) return []

  const results: CompanyDuplicate[] = []
  const seen = new Set<string>()

  // Exact CNPJ match
  if (company.cnpj) {
    const { data } = await supabase
      .from('companies')
      .select('id, name, domain, cnpj')
      .eq('organization_id', organizationId)
      .eq('cnpj', company.cnpj)
      .is('archived_at', null)
      .neq('id', companyId)
    for (const c of data ?? []) {
      if (!seen.has(c.id)) { seen.add(c.id); results.push({ ...c, reason: 'cnpj' }) }
    }
  }

  // Exact domain match
  if (company.domain) {
    const { data } = await supabase
      .from('companies')
      .select('id, name, domain, cnpj')
      .eq('organization_id', organizationId)
      .eq('domain', company.domain)
      .is('archived_at', null)
      .neq('id', companyId)
    for (const c of data ?? []) {
      if (!seen.has(c.id)) { seen.add(c.id); results.push({ ...c, reason: 'domain' }) }
    }
  }

  // Fuzzy name match
  if (company.name) {
    const { data } = await supabase
      .from('companies')
      .select('id, name, domain, cnpj')
      .eq('organization_id', organizationId)
      .is('archived_at', null)
      .neq('id', companyId)
      .ilike('name', `%${company.name.split(' ')[0]}%`)
    for (const c of data ?? []) {
      if (!seen.has(c.id)) { seen.add(c.id); results.push({ ...c, reason: 'name' }) }
    }
  }

  return results
}
