import { z } from 'zod'
import { isCPF, stripMask } from '@/lib/cpf-cnpj'

export const contactSchema = z.object({
  full_name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  cpf: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || isCPF(stripMask(v ?? '')), { message: 'CPF inválido' }),
  job_title: z.string().max(100).optional().or(z.literal('')),
  tags: z.array(z.string()).default([]),
  owner_id: z.string().uuid().optional().or(z.literal('')),
})

export type ContactInput = z.infer<typeof contactSchema>
