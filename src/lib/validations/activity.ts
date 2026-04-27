import { z } from 'zod'

export const callSchema = z.object({
  subject_type: z.enum(['contact', 'deal']),
  subject_id: z.string().uuid(),
  contact_id: z.string().uuid().nullable().optional(),
  deal_id: z.string().uuid().nullable().optional(),
  duration_minutes: z.coerce.number().int().min(0).max(600).nullable().optional(),
  outcome: z.enum(['connected', 'voicemail', 'no_answer', 'rescheduled']).nullable().optional(),
  body: z.string().max(5000).nullable().optional(),
  occurred_at: z.string().datetime().optional(), // ISO, defaults to NOW on the server if absent
})

export const meetingSchema = z.object({
  subject_type: z.enum(['contact', 'deal']),
  subject_id: z.string().uuid(),
  contact_id: z.string().uuid().nullable().optional(),
  deal_id: z.string().uuid().nullable().optional(),
  duration_minutes: z.coerce.number().int().min(0).max(600).nullable().optional(),
  body: z.string().max(5000).nullable().optional(),
  participants: z.array(z.string().uuid()).max(20).default([]),
  occurred_at: z.string().datetime(), // meeting requires explicit date-time
})

export const noteSchema = z.object({
  subject_type: z.enum(['contact', 'company', 'deal']),
  subject_id: z.string().uuid(),
  contact_id: z.string().uuid().nullable().optional(),
  deal_id: z.string().uuid().nullable().optional(),
  body: z.string().min(1).max(10000),
})

export type CallInput = z.infer<typeof callSchema>
export type MeetingInput = z.infer<typeof meetingSchema>
export type NoteInput = z.infer<typeof noteSchema>
