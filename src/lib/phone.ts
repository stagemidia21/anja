import { parsePhoneNumber } from 'libphonenumber-js'

export function normalizePhone(
  raw: string,
  country: string = 'BR'
): { phone: string; phone_e164: string } | null {
  try {
    const parsed = parsePhoneNumber(raw, country as any)
    if (!parsed.isValid()) return null
    return { phone: raw.trim(), phone_e164: parsed.format('E.164') }
  } catch {
    return null
  }
}
