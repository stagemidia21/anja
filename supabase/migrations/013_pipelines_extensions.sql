-- 013_pipelines_extensions.sql
-- Phase 3 Plan 01 — Extensoes em pipelines/pipeline_stages + Realtime publication
-- Pipelines e pipeline_stages ja existem (004_org_invitations.sql). NAO recriar.

-- =========================================
-- pipelines: rotten_days + UNIQUE(org, lower(name))
-- =========================================
ALTER TABLE public.pipelines
  ADD COLUMN IF NOT EXISTS rotten_days INTEGER NOT NULL DEFAULT 30
    CHECK (rotten_days BETWEEN 1 AND 365);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pipelines_org_name_active
  ON public.pipelines(organization_id, lower(name))
  WHERE archived_at IS NULL;

-- =========================================
-- pipeline_stages: UNIQUE(pipeline_id, position) para ordenacao estavel
-- Indice parcial permite reordenacao em transacao (camada de app bumpa position em steps).
-- =========================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_pipeline_stages_position_active
  ON public.pipeline_stages(pipeline_id, position)
  WHERE archived_at IS NULL;

-- =========================================
-- Realtime: adicionar deals a publication supabase_realtime
-- Idempotente: DROP TABLE em bloco EXCEPTION para re-adicionar sem erro.
-- =========================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Remove se ja estava (para re-adicionar idempotente); ignora erro se nao estava
    BEGIN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.deals;
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
  END IF;
END $$;

-- =========================================
-- REPLICA IDENTITY FULL para que Postgres Changes envie OLD tambem
-- Necessario para que client-side compare stage_id antigo vs novo em Realtime payload.
-- =========================================
ALTER TABLE public.deals REPLICA IDENTITY FULL;
