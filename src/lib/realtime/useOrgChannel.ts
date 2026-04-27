'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js'

type DealRow = {
  id: string
  organization_id: string
  stage_id: string
  pipeline_id: string
}

type Payload = RealtimePostgresChangesPayload<DealRow>

/**
 * Subscreve postgres_changes em public.deals filtrado por organization_id.
 * Invoca onChange para INSERT/UPDATE/DELETE (com old + new quando disponivel).
 * Reconecta automaticamente quando a aba volta a ficar visivel.
 *
 * Channel name: `org:${organizationId}:deals` — canal por organizacao conforme
 * constraint de multi-tenant em STACK.md.
 */
export function useOrgDealsChannel(
  organizationId: string | null,
  pipelineId: string | null,
  onChange: (payload: Payload) => void,
) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!organizationId || !pipelineId) return

    const supabase = createClient()
    let channel: RealtimeChannel | null = null

    function subscribe() {
      channel = supabase
        .channel(`org:${organizationId}:deals`)
        .on(
          'postgres_changes' as unknown as never,
          {
            event: '*',
            schema: 'public',
            table: 'deals',
            filter: `organization_id=eq.${organizationId}`,
          },
          (payload: Payload) => {
            // Filtrar client-side por pipeline_id (Realtime filter string nao aceita
            // AND composto nativamente sem view dedicada).
            const row = (payload.new ?? payload.old) as Partial<DealRow> | null
            if (row && row.pipeline_id && row.pipeline_id !== pipelineId) return
            onChangeRef.current(payload)
          },
        )
        .subscribe()
    }

    subscribe()

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        if (channel) supabase.removeChannel(channel)
        subscribe()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      if (channel) supabase.removeChannel(channel)
    }
  }, [organizationId, pipelineId])
}
