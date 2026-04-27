'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrg } from '@/lib/auth/require-org'
import {
  dealSchema,
  outcomeSchema,
  moveDealSchema,
  dealFiltersSchema,
  type DealFilters,
} from '@/lib/validations/deal'

export type KanbanDeal = {
  id: string
  title: string
  value: number | null
  currency: string
  contact_id: string | null
  company_id: string | null
  owner_id: string | null
  expected_close_date: string | null
  stage_id: string
  pipeline_id: string
  last_activity_at: string | null
  created_at: string
  outcome: 'won' | 'lost' | null
  tags: string[]
  position: number | null
  contact?: { id: string; full_name: string } | null
  company?: { id: string; name: string } | null
}

export async function listDealsByPipeline(
  pipelineId: string,
  filters: DealFilters = {}
) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const f = dealFiltersSchema.safeParse(filters)
  if (!f.success) return { data: [], error: f.error.issues[0].message }

  let q = supabase
    .from('deals')
    .select(
      `
      id, title, value, currency, contact_id, company_id, owner_id,
      expected_close_date, stage_id, pipeline_id, last_activity_at,
      created_at, outcome, tags, position,
      contact:contacts!deals_contact_id_fkey(id, full_name),
      company:companies!deals_company_id_fkey(id, name)
    `
    )
    .eq('organization_id', organizationId)
    .eq('pipeline_id', pipelineId)
    .is('archived_at', null)
    .order('position', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (f.data.ownerId) q = q.eq('owner_id', f.data.ownerId)
  if (f.data.tag) q = q.contains('tags', [f.data.tag])
  if (f.data.minValue !== undefined) q = q.gte('value', f.data.minValue)
  if (f.data.maxValue !== undefined) q = q.lte('value', f.data.maxValue)
  if (f.data.fromDate) q = q.gte('expected_close_date', f.data.fromDate)
  if (f.data.toDate) q = q.lte('expected_close_date', f.data.toDate)
  if (f.data.search) q = q.ilike('title', `%${f.data.search}%`)

  const { data, error } = await q
  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as unknown as KanbanDeal[] }
}

export async function listDealsTable(
  pipelineId: string,
  params: {
    page?: number
    perPage?: number
    sortBy?: 'title' | 'value' | 'expected_close_date' | 'created_at'
    sortDir?: 'asc' | 'desc'
    filters?: DealFilters
  } = {}
) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()
  const {
    page = 1,
    perPage = 25,
    sortBy = 'created_at',
    sortDir = 'desc',
    filters = {},
  } = params

  const f = dealFiltersSchema.safeParse(filters)
  if (!f.success) return { data: [], count: 0, error: f.error.issues[0].message }

  let q = supabase
    .from('deals')
    .select(
      `
      id, title, value, currency, owner_id, expected_close_date,
      stage_id, last_activity_at, created_at, outcome, tags,
      contact:contacts!deals_contact_id_fkey(id, full_name),
      company:companies!deals_company_id_fkey(id, name),
      stage:pipeline_stages!deals_stage_id_fkey(id, name, stage_type)
    `,
      { count: 'exact' }
    )
    .eq('organization_id', organizationId)
    .eq('pipeline_id', pipelineId)
    .is('archived_at', null)
    .order(sortBy, { ascending: sortDir === 'asc' })
    .range((page - 1) * perPage, page * perPage - 1)

  if (f.data.ownerId) q = q.eq('owner_id', f.data.ownerId)
  if (f.data.tag) q = q.contains('tags', [f.data.tag])
  if (f.data.minValue !== undefined) q = q.gte('value', f.data.minValue)
  if (f.data.maxValue !== undefined) q = q.lte('value', f.data.maxValue)
  if (f.data.fromDate) q = q.gte('expected_close_date', f.data.fromDate)
  if (f.data.toDate) q = q.lte('expected_close_date', f.data.toDate)
  if (f.data.search) q = q.ilike('title', `%${f.data.search}%`)

  const { data, count, error } = await q
  if (error) return { data: [], count: 0, error: error.message }
  return { data: data ?? [], count: count ?? 0 }
}

export async function getDeal(id: string) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const { data, error } = await supabase
    .from('deals')
    .select(
      `
      *,
      contact:contacts!deals_contact_id_fkey(id, full_name, email, phone),
      company:companies!deals_company_id_fkey(id, name),
      stage:pipeline_stages!deals_stage_id_fkey(id, name, stage_type, default_probability),
      pipeline:pipelines!deals_pipeline_id_fkey(id, name, rotten_days),
      deal_contacts(
        contact_id, role, is_primary,
        contacts(id, full_name, email)
      )
    `
    )
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  if (error || !data) return null
  return data
}

export async function createDeal(formData: FormData) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const raw = {
    title: formData.get('title') as string,
    value: (formData.get('value') as string) ?? '',
    currency: (formData.get('currency') as string) || 'BRL',
    pipeline_id: formData.get('pipeline_id') as string,
    stage_id: formData.get('stage_id') as string,
    contact_id: (formData.get('contact_id') as string) || '',
    company_id: (formData.get('company_id') as string) || '',
    owner_id: (formData.get('owner_id') as string) || '',
    expected_close_date: (formData.get('expected_close_date') as string) || '',
    tags: ((formData.get('tags') as string) ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  }
  const parsed = dealSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data: deal, error } = await supabase
    .from('deals')
    .insert({
      organization_id: organizationId,
      title: parsed.data.title,
      value: parsed.data.value ?? null,
      currency: parsed.data.currency,
      pipeline_id: parsed.data.pipeline_id,
      stage_id: parsed.data.stage_id,
      contact_id: parsed.data.contact_id || null,
      company_id: parsed.data.company_id || null,
      owner_id: parsed.data.owner_id || null,
      expected_close_date: parsed.data.expected_close_date,
      tags: parsed.data.tags,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Espelhar contact_id primario em deal_contacts (DEAL-09)
  if (parsed.data.contact_id) {
    await supabase.from('deal_contacts').insert({
      deal_id: deal.id,
      contact_id: parsed.data.contact_id,
      organization_id: organizationId,
      is_primary: true,
    })
  }

  revalidatePath('/crm/pipeline')
  revalidatePath(`/crm/pipeline/${parsed.data.pipeline_id}`)
  return { data: deal }
}

export async function updateDeal(id: string, formData: FormData) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const raw = {
    title: formData.get('title') as string,
    value: (formData.get('value') as string) ?? '',
    currency: (formData.get('currency') as string) || 'BRL',
    pipeline_id: formData.get('pipeline_id') as string,
    stage_id: formData.get('stage_id') as string,
    contact_id: (formData.get('contact_id') as string) || '',
    company_id: (formData.get('company_id') as string) || '',
    owner_id: (formData.get('owner_id') as string) || '',
    expected_close_date: (formData.get('expected_close_date') as string) || '',
    tags: ((formData.get('tags') as string) ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  }
  const parsed = dealSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase
    .from('deals')
    .update({
      title: parsed.data.title,
      value: parsed.data.value ?? null,
      currency: parsed.data.currency,
      pipeline_id: parsed.data.pipeline_id,
      stage_id: parsed.data.stage_id,
      contact_id: parsed.data.contact_id || null,
      company_id: parsed.data.company_id || null,
      owner_id: parsed.data.owner_id || null,
      expected_close_date: parsed.data.expected_close_date,
      tags: parsed.data.tags,
    })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }
  revalidatePath(`/crm/deals/${id}`)
  revalidatePath('/crm/pipeline')
  return { success: true }
}

export async function moveDealStage(input: {
  deal_id: string
  stage_id: string
  position?: number
}) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const parsed = moveDealSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Validar que stage_id pertence a mesma org (defesa em profundidade alem de RLS)
  const { data: stage } = await supabase
    .from('pipeline_stages')
    .select('id, pipeline_id')
    .eq('id', parsed.data.stage_id)
    .eq('organization_id', organizationId)
    .single()
  if (!stage) return { error: 'Estagio invalido' }

  const patch: { stage_id: string; position?: number } = {
    stage_id: parsed.data.stage_id,
  }
  if (parsed.data.position !== undefined) patch.position = parsed.data.position

  const { error } = await supabase
    .from('deals')
    .update(patch)
    .eq('id', parsed.data.deal_id)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }
  // NOTA: nao chamamos revalidatePath aqui para nao invalidar cache em todo drag.
  // O Realtime do Plan 03 propaga a mudanca para outros clients.
  return { success: true }
}

export async function markDealOutcome(
  dealId: string,
  input: { outcome: 'won' | 'lost'; close_reason?: string }
) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const parsed = outcomeSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Buscar deal para saber pipeline_id
  const { data: deal } = await supabase
    .from('deals')
    .select('pipeline_id')
    .eq('id', dealId)
    .eq('organization_id', organizationId)
    .single()
  if (!deal) return { error: 'Deal nao encontrado' }

  // Encontrar primeiro stage com stage_type=outcome no pipeline
  const { data: targetStage } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('pipeline_id', deal.pipeline_id)
    .eq('stage_type', parsed.data.outcome)
    .is('archived_at', null)
    .order('position', { ascending: true })
    .limit(1)
    .single()
  if (!targetStage) {
    return {
      error: `Pipeline nao tem estagio do tipo "${parsed.data.outcome}"`,
    }
  }

  const { error } = await supabase
    .from('deals')
    .update({
      outcome: parsed.data.outcome,
      close_reason: parsed.data.close_reason || null,
      closed_at: new Date().toISOString(),
      stage_id: targetStage.id,
    })
    .eq('id', dealId)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }
  revalidatePath('/crm/pipeline')
  revalidatePath(`/crm/deals/${dealId}`)
  return { success: true }
}

export async function archiveDeal(dealId: string) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const { error } = await supabase
    .from('deals')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', dealId)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }
  revalidatePath('/crm/pipeline')
  return { success: true }
}

// =========================================
// deal_contacts (N:M buying committee)
// =========================================

export async function addDealContact(
  dealId: string,
  contactId: string,
  role?: string
) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const { error } = await supabase.from('deal_contacts').insert({
    deal_id: dealId,
    contact_id: contactId,
    organization_id: organizationId,
    role: role || null,
    is_primary: false,
  })
  if (error) return { error: error.message }
  revalidatePath(`/crm/deals/${dealId}`)
  return { success: true }
}

export async function removeDealContact(dealId: string, contactId: string) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const { error } = await supabase
    .from('deal_contacts')
    .delete()
    .eq('deal_id', dealId)
    .eq('contact_id', contactId)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }
  revalidatePath(`/crm/deals/${dealId}`)
  return { success: true }
}

export async function setPrimaryDealContact(dealId: string, contactId: string) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  await supabase
    .from('deal_contacts')
    .update({ is_primary: false })
    .eq('deal_id', dealId)
    .eq('organization_id', organizationId)

  const { error } = await supabase
    .from('deal_contacts')
    .update({ is_primary: true })
    .eq('deal_id', dealId)
    .eq('contact_id', contactId)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }

  // Sincronizar deals.contact_id com o primary
  await supabase
    .from('deals')
    .update({ contact_id: contactId })
    .eq('id', dealId)
    .eq('organization_id', organizationId)

  revalidatePath(`/crm/deals/${dealId}`)
  return { success: true }
}
