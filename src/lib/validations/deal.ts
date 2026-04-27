import { z } from 'zod'

export const dealSchema = z.object({
  title: z.string().min(1, 'Titulo e obrigatorio').max(200),
  value: z
    .union([z.string(), z.number()])
    .transform((v) => (v === '' || v === null || v === undefined ? null : Number(v)))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), {
      message: 'Valor invalido',
    })
    .nullable()
    .optional(),
  currency: z.string().length(3).default('BRL'),
  pipeline_id: z.string().uuid('Pipeline invalido'),
  stage_id: z.string().uuid('Estagio invalido'),
  contact_id: z.string().uuid().optional().or(z.literal('')),
  company_id: z.string().uuid().optional().or(z.literal('')),
  owner_id: z.string().uuid().optional().or(z.literal('')),
  expected_close_date: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v : null)),
  tags: z.array(z.string()).default([]),
})

export type DealInput = z.infer<typeof dealSchema>

export const outcomeSchema = z.object({
  outcome: z.enum(['won', 'lost']),
  close_reason: z.string().max(500).optional().or(z.literal('')),
})

export type OutcomeInput = z.infer<typeof outcomeSchema>

export const moveDealSchema = z.object({
  deal_id: z.string().uuid(),
  stage_id: z.string().uuid(),
  position: z.number().optional(),
})

export type MoveDealInput = z.infer<typeof moveDealSchema>

export const dealFiltersSchema = z.object({
  ownerId: z.string().uuid().optional(),
  tag: z.string().optional(),
  minValue: z.coerce.number().optional(),
  maxValue: z.coerce.number().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  search: z.string().optional(),
})

export type DealFilters = z.infer<typeof dealFiltersSchema>
