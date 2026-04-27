import { z } from 'zod'
import { isCNPJ, stripMask } from '@/lib/cpf-cnpj'

export const companySizeEnum = z.enum(['micro', 'pequena', 'media', 'grande']).optional()

export const companySchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().max(200).optional().or(z.literal('')),
  cnpj: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || isCNPJ(stripMask(v ?? '')), { message: 'CNPJ inválido' }),
  industry: z.string().max(100).optional().or(z.literal('')),
  size: companySizeEnum,
  tags: z.array(z.string()).default([]),
  owner_id: z.string().uuid().optional().or(z.literal('')),
})

export type CompanyInput = z.infer<typeof companySchema>
