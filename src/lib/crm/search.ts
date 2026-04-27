'use server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-current-user'

export type SearchHit = {
  entity_type: 'contact' | 'company'
  entity_id: string
  title: string
  subtitle: string | null
  rank: number
}

export async function globalSearch(q: string, max = 10): Promise<SearchHit[]> {
  if (!q || q.trim().length < 2) return []
  await requireUser()
  const supabase = createClient()
  const { data, error } = await supabase.rpc('search_global', {
    q: q.trim(),
    max_results: max,
  })
  if (error) {
    console.error('[search_global]', error)
    return []
  }
  return (data ?? []) as SearchHit[]
}
