import { z } from 'zod'

export const pipelineSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio').max(80, 'Nome muito longo'),
  is_default: z.boolean().optional().default(false),
  rotten_days: z.coerce.number().int().min(1).max(365).optional().default(30),
})

export type PipelineInput = z.infer<typeof pipelineSchema>

export const stageSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio').max(60),
  position: z.coerce.number(),
  stage_type: z.enum(['open', 'won', 'lost']).default('open'),
  default_probability: z.coerce.number().int().min(0).max(100).default(50),
})

export type StageInput = z.infer<typeof stageSchema>

export const reorderStagesSchema = z.object({
  pipeline_id: z.string().uuid(),
  stages: z
    .array(
      z.object({
        id: z.string().uuid(),
        position: z.number(),
      })
    )
    .min(1),
})

export type ReorderStagesInput = z.infer<typeof reorderStagesSchema>
