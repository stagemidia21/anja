import type { SupabaseClient } from '@supabase/supabase-js'

interface RateLimitResult {
  allowed: boolean
  current: number
  limit: number
  plan: string
}

/**
 * Verifica e incrementa o uso mensal do usuário atomicamente.
 * Fail-open: se o RPC falhar, permite a requisição para não bloquear usuários pagantes.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<RateLimitResult> {
  try {
    const yearMonth = new Date().toISOString().slice(0, 7) // ex: '2026-04'

    const { data, error } = await supabase.rpc('check_and_increment_usage', {
      p_user_id: userId,
      p_year_month: yearMonth,
    })

    if (error) {
      console.error('[rate-limit] Erro no RPC:', error)
      return { allowed: true, current: 0, limit: 0, plan: 'unknown' }
    }

    return data as RateLimitResult
  } catch (e) {
    console.error('[rate-limit] Exceção:', e)
    return { allowed: true, current: 0, limit: 0, plan: 'unknown' }
  }
}
