'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrg } from '@/lib/auth/require-org'
import {
  pipelineSchema,
  stageSchema,
  reorderStagesSchema,
} from '@/lib/validations/pipeline'

// =========================================
// PIPELINES
// =========================================

export async function listPipelines() {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const { data, error } = await supabase
    .from('pipelines')
    .select('id, name, is_default, rotten_days, created_at')
    .eq('organization_id', organizationId)
    .is('archived_at', null)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true })

  if (error) return { data: [], error: error.message }
  return { data: data ?? [] }
}

export async function getPipeline(id: string) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const { data, error } = await supabase
    .from('pipelines')
    .select(
      `
      id, name, is_default, rotten_days, created_at,
      pipeline_stages (
        id, name, position, stage_type, default_probability, archived_at
      )
    `
    )
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('archived_at', null)
    .single()

  if (error || !data) return null

  const stages = ((data.pipeline_stages ?? []) as any[])
    .filter((s: any) => s.archived_at === null)
    .sort((a: any, b: any) => Number(a.position) - Number(b.position))

  return { ...data, pipeline_stages: stages }
}

export async function createPipeline(formData: FormData) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const raw = {
    name: formData.get('name') as string,
    is_default: formData.get('is_default') === 'true',
    rotten_days: formData.get('rotten_days') as string,
  }
  const parsed = pipelineSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Se is_default=true, desmarcar outros defaults da org
  if (parsed.data.is_default) {
    await supabase
      .from('pipelines')
      .update({ is_default: false })
      .eq('organization_id', organizationId)
      .eq('is_default', true)
  }

  const { data, error } = await supabase
    .from('pipelines')
    .insert({
      organization_id: organizationId,
      name: parsed.data.name,
      is_default: parsed.data.is_default,
      rotten_days: parsed.data.rotten_days,
    })
    .select()
    .single()

  if (error) {
    if (error.message.includes('uq_pipelines_org_name_active')) {
      return { error: 'Ja existe um pipeline com esse nome nesta organizacao' }
    }
    return { error: error.message }
  }

  revalidatePath('/crm/pipeline')
  revalidatePath('/crm/settings/pipelines')
  return { data }
}

export async function updatePipeline(id: string, formData: FormData) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const raw = {
    name: formData.get('name') as string,
    is_default: formData.get('is_default') === 'true',
    rotten_days: formData.get('rotten_days') as string,
  }
  const parsed = pipelineSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  if (parsed.data.is_default) {
    await supabase
      .from('pipelines')
      .update({ is_default: false })
      .eq('organization_id', organizationId)
      .eq('is_default', true)
      .neq('id', id)
  }

  const { error } = await supabase
    .from('pipelines')
    .update({
      name: parsed.data.name,
      is_default: parsed.data.is_default,
      rotten_days: parsed.data.rotten_days,
    })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    if (error.message.includes('uq_pipelines_org_name_active')) {
      return { error: 'Ja existe um pipeline com esse nome nesta organizacao' }
    }
    return { error: error.message }
  }
  revalidatePath('/crm/pipeline')
  revalidatePath('/crm/settings/pipelines')
  return { success: true }
}

export async function archivePipeline(id: string) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const { error } = await supabase
    .from('pipelines')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }
  revalidatePath('/crm/pipeline')
  revalidatePath('/crm/settings/pipelines')
  return { success: true }
}

// =========================================
// STAGES
// =========================================

export async function listStages(pipelineId: string) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('id, name, position, stage_type, default_probability')
    .eq('organization_id', organizationId)
    .eq('pipeline_id', pipelineId)
    .is('archived_at', null)
    .order('position', { ascending: true })

  if (error) return { data: [], error: error.message }
  return { data: data ?? [] }
}

export async function createStage(pipelineId: string, formData: FormData) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const raw = {
    name: formData.get('name') as string,
    position: formData.get('position') as string,
    stage_type: (formData.get('stage_type') as string) || 'open',
    default_probability: (formData.get('default_probability') as string) || '50',
  }
  const parsed = stageSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data, error } = await supabase
    .from('pipeline_stages')
    .insert({
      organization_id: organizationId,
      pipeline_id: pipelineId,
      name: parsed.data.name,
      position: parsed.data.position,
      stage_type: parsed.data.stage_type,
      default_probability: parsed.data.default_probability,
    })
    .select()
    .single()

  if (error) {
    if (error.message.includes('uq_pipeline_stages_position_active')) {
      return { error: 'Ja existe um estagio nessa posicao' }
    }
    return { error: error.message }
  }
  revalidatePath('/crm/pipeline')
  revalidatePath('/crm/settings/pipelines')
  return { data }
}

export async function updateStage(stageId: string, formData: FormData) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const raw = {
    name: formData.get('name') as string,
    position: formData.get('position') as string,
    stage_type: (formData.get('stage_type') as string) || 'open',
    default_probability: (formData.get('default_probability') as string) || '50',
  }
  const parsed = stageSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase
    .from('pipeline_stages')
    .update({
      name: parsed.data.name,
      position: parsed.data.position,
      stage_type: parsed.data.stage_type,
      default_probability: parsed.data.default_probability,
    })
    .eq('id', stageId)
    .eq('organization_id', organizationId)

  if (error) {
    if (error.message.includes('uq_pipeline_stages_position_active')) {
      return { error: 'Ja existe um estagio nessa posicao' }
    }
    return { error: error.message }
  }
  revalidatePath('/crm/pipeline')
  revalidatePath('/crm/settings/pipelines')
  return { success: true }
}

export async function archiveStage(stageId: string) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  // Nao permitir arquivar stage que tenha deals abertos
  const { count } = await supabase
    .from('deals')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('stage_id', stageId)
    .is('archived_at', null)

  if ((count ?? 0) > 0) {
    return {
      error:
        'Nao e possivel arquivar um estagio com deals abertos. Mova os deals primeiro.',
    }
  }

  const { error } = await supabase
    .from('pipeline_stages')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', stageId)
    .eq('organization_id', organizationId)

  if (error) return { error: error.message }
  revalidatePath('/crm/pipeline')
  revalidatePath('/crm/settings/pipelines')
  return { success: true }
}

export async function reorderStages(input: {
  pipeline_id: string
  stages: { id: string; position: number }[]
}) {
  const { organizationId } = await requireOrg()
  const supabase = createClient()

  const parsed = reorderStagesSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Shift-then-set: primeiro mover para positions temporarias (negativas) para evitar colisao
  // no indice uq_pipeline_stages_position_active, depois setar as finais.
  const tempBase = -1_000_000
  for (let i = 0; i < parsed.data.stages.length; i++) {
    const s = parsed.data.stages[i]
    const { error } = await supabase
      .from('pipeline_stages')
      .update({ position: tempBase - i })
      .eq('id', s.id)
      .eq('organization_id', organizationId)
      .eq('pipeline_id', parsed.data.pipeline_id)
    if (error) return { error: error.message }
  }
  for (const s of parsed.data.stages) {
    const { error } = await supabase
      .from('pipeline_stages')
      .update({ position: s.position })
      .eq('id', s.id)
      .eq('organization_id', organizationId)
      .eq('pipeline_id', parsed.data.pipeline_id)
    if (error) return { error: error.message }
  }

  revalidatePath('/crm/pipeline')
  revalidatePath('/crm/settings/pipelines')
  return { success: true }
}
