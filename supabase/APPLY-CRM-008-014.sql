-- ==============================================
-- CRM Migrations 008-014 — apply in this order
-- Generated Mon Apr 27 18:51:59     2026
-- ==============================================


-- ─────────────────────────────────────────────
-- 008_search_vectors.sql
-- ─────────────────────────────────────────────
-- 008_search_vectors.sql
-- Phase 2 Plan 01 — Full-text search tsvector + pg_trgm fuzzy

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Immutable wrapper so unaccent can be used in GENERATED ALWAYS STORED
CREATE OR REPLACE FUNCTION f_unaccent(TEXT)
RETURNS TEXT LANGUAGE SQL IMMUTABLE PARALLEL SAFE AS $$
  SELECT public.unaccent('public.unaccent', $1);
$$;

-- contacts.search_vector
ALTER TABLE contacts
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese'::regconfig, f_unaccent(coalesce(full_name, ''))), 'A') ||
    setweight(to_tsvector('simple'::regconfig,     coalesce(email, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig,     coalesce(phone_e164, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig,     coalesce(cpf, '')), 'B') ||
    setweight(to_tsvector('portuguese'::regconfig, f_unaccent(coalesce(array_to_string(tags, ' '), ''))), 'C') ||
    setweight(to_tsvector('portuguese'::regconfig, f_unaccent(coalesce(job_title, ''))), 'D')
  ) STORED;

CREATE INDEX idx_contacts_search_gin ON contacts USING GIN (search_vector);
CREATE INDEX idx_contacts_name_trgm  ON contacts USING GIN (full_name gin_trgm_ops);
CREATE INDEX idx_contacts_email_trgm ON contacts USING GIN (email gin_trgm_ops);

-- companies.search_vector
ALTER TABLE companies
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese'::regconfig, f_unaccent(coalesce(name, ''))), 'A') ||
    setweight(to_tsvector('simple'::regconfig,     coalesce(domain, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig,     coalesce(cnpj, '')), 'B') ||
    setweight(to_tsvector('portuguese'::regconfig, f_unaccent(coalesce(industry, ''))), 'C') ||
    setweight(to_tsvector('portuguese'::regconfig, f_unaccent(coalesce(array_to_string(tags, ' '), ''))), 'C')
  ) STORED;

CREATE INDEX idx_companies_search_gin ON companies USING GIN (search_vector);
CREATE INDEX idx_companies_name_trgm  ON companies USING GIN (name gin_trgm_ops);


-- ─────────────────────────────────────────────
-- 009_merge_contacts_fn.sql
-- ─────────────────────────────────────────────
-- 009_merge_contacts_fn.sql
-- Phase 2 Plan 01 — merge_contacts(source, target) preserves history transactionally

CREATE OR REPLACE FUNCTION merge_contacts(source_id UUID, target_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  src_org UUID;
  tgt_org UUID;
BEGIN
  IF source_id = target_id THEN
    RAISE EXCEPTION 'merge_contacts_same_id';
  END IF;

  SELECT organization_id INTO src_org FROM contacts WHERE id = source_id;
  SELECT organization_id INTO tgt_org FROM contacts WHERE id = target_id;

  IF src_org IS NULL OR tgt_org IS NULL THEN
    RAISE EXCEPTION 'merge_contacts_not_found';
  END IF;

  IF src_org <> tgt_org THEN
    RAISE EXCEPTION 'merge_contacts_cross_org';
  END IF;

  -- Move company links, respecting composite UNIQUE (contact_id, company_id)
  UPDATE contact_company_links
     SET contact_id = target_id
   WHERE contact_id = source_id
     AND NOT EXISTS (
       SELECT 1 FROM contact_company_links ccl2
        WHERE ccl2.contact_id = target_id
          AND ccl2.company_id = contact_company_links.company_id
     );
  DELETE FROM contact_company_links WHERE contact_id = source_id;

  -- Move activities (both denormalized FK and polymorphic subject)
  UPDATE activities SET contact_id = target_id WHERE contact_id = source_id;
  UPDATE activities
     SET subject_id = target_id
   WHERE subject_type = 'contact' AND subject_id = source_id;

  -- Soft-delete source with merged_into_id breadcrumb
  UPDATE contacts
     SET archived_at = NOW(),
         merged_into_id = target_id
   WHERE id = source_id;
END;
$$;

GRANT EXECUTE ON FUNCTION merge_contacts(UUID, UUID) TO authenticated;


-- ─────────────────────────────────────────────
-- 010_search_global_fn.sql
-- ─────────────────────────────────────────────
-- 010_search_global_fn.sql
-- Phase 2 Plan 01 — search_global RPC: Cmd+K cross-entity search
-- SECURITY INVOKER so RLS is_member_of applies on caller's organization.

CREATE OR REPLACE FUNCTION search_global(q TEXT, max_results INT DEFAULT 10)
RETURNS TABLE (
  entity_type TEXT,
  entity_id UUID,
  title TEXT,
  subtitle TEXT,
  rank REAL
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH query AS (
    SELECT websearch_to_tsquery('portuguese', f_unaccent(q)) AS tsq,
           q AS raw_q
  ),
  contact_hits AS (
    SELECT 'contact'::TEXT AS entity_type,
           c.id AS entity_id,
           c.full_name AS title,
           c.email AS subtitle,
           (ts_rank_cd(c.search_vector, query.tsq)
             + GREATEST(similarity(c.full_name, query.raw_q),
                        similarity(coalesce(c.email, ''), query.raw_q)))::REAL AS rank
      FROM contacts c, query
     WHERE c.archived_at IS NULL
       AND (
         c.search_vector @@ query.tsq
         OR c.full_name % query.raw_q
         OR coalesce(c.email, '') % query.raw_q
       )
     ORDER BY rank DESC
     LIMIT max_results
  ),
  company_hits AS (
    SELECT 'company'::TEXT AS entity_type,
           co.id AS entity_id,
           co.name AS title,
           co.domain AS subtitle,
           (ts_rank_cd(co.search_vector, query.tsq)
             + similarity(co.name, query.raw_q))::REAL AS rank
      FROM companies co, query
     WHERE co.archived_at IS NULL
       AND (
         co.search_vector @@ query.tsq
         OR co.name % query.raw_q
       )
     ORDER BY rank DESC
     LIMIT max_results
  )
  SELECT * FROM contact_hits
  UNION ALL
  SELECT * FROM company_hits
  ORDER BY rank DESC;
$$;

GRANT EXECUTE ON FUNCTION search_global(TEXT, INT) TO authenticated;


-- ─────────────────────────────────────────────
-- 011_deals_schema.sql
-- ─────────────────────────────────────────────
-- 011_deals_schema.sql
-- Phase 3 Plan 01 — Deals + deal_contacts N:M + RLS + indexes
-- Pipelines e pipeline_stages ja existem (004_org_invitations.sql). NAO recriar.

-- =========================================
-- deals
-- =========================================
CREATE TABLE IF NOT EXISTS public.deals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pipeline_id           UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE RESTRICT,
  stage_id              UUID NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE RESTRICT,
  title                 TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  value                 NUMERIC(15,2),
  currency              CHAR(3) NOT NULL DEFAULT 'BRL',
  contact_id            UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id            UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  owner_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expected_close_date   DATE,
  closed_at             TIMESTAMPTZ,
  close_reason          TEXT,
  outcome               TEXT CHECK (outcome IN ('won', 'lost')),
  tags                  TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  custom_fields         JSONB NOT NULL DEFAULT '{}'::JSONB,
  last_activity_at      TIMESTAMPTZ,
  position              NUMERIC,
  archived_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT deals_outcome_requires_closed_at
    CHECK (outcome IS NULL OR closed_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_deals_org_stage_active
  ON public.deals(organization_id, stage_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_deals_org_pipeline_active
  ON public.deals(organization_id, pipeline_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_deals_org_owner
  ON public.deals(organization_id, owner_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_deals_contact
  ON public.deals(organization_id, contact_id)
  WHERE contact_id IS NOT NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_deals_company
  ON public.deals(organization_id, company_id)
  WHERE company_id IS NOT NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_deals_tags_gin
  ON public.deals USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_deals_custom_fields_gin
  ON public.deals USING GIN (custom_fields);

CREATE INDEX IF NOT EXISTS idx_deals_last_activity
  ON public.deals(organization_id, last_activity_at DESC NULLS LAST)
  WHERE archived_at IS NULL;

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY deals_select ON public.deals FOR SELECT
  USING (public.is_member_of(organization_id));

CREATE POLICY deals_insert ON public.deals FOR INSERT
  WITH CHECK (public.is_member_of(organization_id, 'vendedor'));

CREATE POLICY deals_update ON public.deals FOR UPDATE
  USING (public.is_member_of(organization_id, 'vendedor'))
  WITH CHECK (public.is_member_of(organization_id, 'vendedor'));

CREATE POLICY deals_delete ON public.deals FOR DELETE
  USING (public.is_member_of(organization_id, 'admin'));

CREATE TRIGGER trg_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- deal_contacts (N:M buying committee)
-- =========================================
CREATE TABLE IF NOT EXISTS public.deal_contacts (
  deal_id         UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role            TEXT,
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (deal_id, contact_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_deal_primary_contact
  ON public.deal_contacts(deal_id)
  WHERE is_primary = TRUE;

CREATE INDEX IF NOT EXISTS idx_dc_contact ON public.deal_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_dc_org ON public.deal_contacts(organization_id);

ALTER TABLE public.deal_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY dc_select ON public.deal_contacts FOR SELECT
  USING (public.is_member_of(organization_id));

CREATE POLICY dc_insert ON public.deal_contacts FOR INSERT
  WITH CHECK (public.is_member_of(organization_id, 'vendedor'));

CREATE POLICY dc_update ON public.deal_contacts FOR UPDATE
  USING (public.is_member_of(organization_id, 'vendedor'))
  WITH CHECK (public.is_member_of(organization_id, 'vendedor'));

CREATE POLICY dc_delete ON public.deal_contacts FOR DELETE
  USING (public.is_member_of(organization_id, 'vendedor'));


-- ─────────────────────────────────────────────
-- 012_deals_triggers.sql
-- ─────────────────────────────────────────────
-- 012_deals_triggers.sql
-- Phase 3 Plan 01 — Triggers de stage_change + last_activity_at
-- ACTIVITY-11 (stage_change) + DEAL-03 (fonte unica da verdade no banco)

-- =========================================
-- log_deal_stage_change
-- Dispara quando deals.stage_id muda em UPDATE e insere activity type='stage_change'
-- com metadata {from_stage_id, to_stage_id, changed_by}.
-- SECURITY DEFINER para contornar RLS de activities (trigger roda no contexto do banco).
-- =========================================
CREATE OR REPLACE FUNCTION public.log_deal_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor UUID;
BEGIN
  -- Apenas dispara quando stage_id muda de fato
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    actor := auth.uid();
    INSERT INTO public.activities (
      organization_id,
      type,
      direction,
      subject_type,
      subject_id,
      deal_id,
      contact_id,
      actor_id,
      body,
      metadata,
      occurred_at
    ) VALUES (
      NEW.organization_id,
      'stage_change',
      'internal',
      'deal',
      NEW.id,
      NEW.id,
      NEW.contact_id,
      actor,
      NULL,
      jsonb_build_object(
        'from_stage_id', OLD.stage_id,
        'to_stage_id',   NEW.stage_id,
        'changed_by',    actor
      ),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deals_stage_change
  AFTER UPDATE OF stage_id ON public.deals
  FOR EACH ROW
  WHEN (OLD.stage_id IS DISTINCT FROM NEW.stage_id)
  EXECUTE FUNCTION public.log_deal_stage_change();

-- =========================================
-- touch_deal_last_activity
-- Quando nova activity referencia um deal, atualiza deals.last_activity_at
-- Evita recursao porque esta fonte e INSERT em activities, nao UPDATE em deals.stage_id
-- =========================================
CREATE OR REPLACE FUNCTION public.touch_deal_last_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.deal_id IS NOT NULL THEN
    UPDATE public.deals
       SET last_activity_at = GREATEST(COALESCE(last_activity_at, 'epoch'::TIMESTAMPTZ), NEW.occurred_at)
     WHERE id = NEW.deal_id
       AND organization_id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activities_touch_deal
  AFTER INSERT ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_deal_last_activity();


-- ─────────────────────────────────────────────
-- 013_pipelines_extensions.sql
-- ─────────────────────────────────────────────
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


-- ─────────────────────────────────────────────
-- 014_tasks_activities_ext.sql
-- ─────────────────────────────────────────────
-- 014_tasks_activities_ext.sql
-- Phase 4 Plan 01 — Tasks, activity_participants, activities extensions
-- REQ: ACTIVITY-04, ACTIVITY-05, ACTIVITY-06, ACTIVITY-08, ACTIVITY-09

-- =========================================
-- tasks
-- =========================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  description     TEXT,
  type            TEXT NOT NULL DEFAULT 'task'
                    CHECK (type IN ('task','call','email','meeting','follow_up','other')),
  priority        TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high')),
  due_at          TIMESTAMPTZ,
  assignee_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_id      UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id         UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  completed_at    TIMESTAMPTZ,
  archived_at     TIMESTAMPTZ,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial indexes for performance on common queries
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_open
  ON public.tasks(organization_id, assignee_id, due_at)
  WHERE completed_at IS NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_contact
  ON public.tasks(organization_id, contact_id)
  WHERE contact_id IS NOT NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_deal
  ON public.tasks(organization_id, deal_id)
  WHERE deal_id IS NOT NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_due_at_open
  ON public.tasks(organization_id, due_at)
  WHERE completed_at IS NULL AND archived_at IS NULL;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_select ON public.tasks
  FOR SELECT USING (public.is_member_of(organization_id));

CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT WITH CHECK (public.is_member_of(organization_id, 'vendedor'));

CREATE POLICY tasks_update ON public.tasks
  FOR UPDATE
  USING (public.is_member_of(organization_id, 'vendedor'))
  WITH CHECK (public.is_member_of(organization_id, 'vendedor'));

CREATE POLICY tasks_delete ON public.tasks
  FOR DELETE USING (public.is_member_of(organization_id, 'admin'));

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Consistency: if completed_at is set, it must be >= created_at
ALTER TABLE public.tasks ADD CONSTRAINT tasks_completed_consistency
  CHECK ((completed_at IS NULL) OR (completed_at IS NOT NULL AND completed_at >= created_at));

-- =========================================
-- activity_participants
-- =========================================
CREATE TABLE IF NOT EXISTS public.activity_participants (
  activity_id     UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (activity_id, contact_id)
);

-- organization_id denormalized so RLS is_member_of() can be checked without joining activities
CREATE INDEX IF NOT EXISTS idx_activity_participants_contact
  ON public.activity_participants(contact_id);

CREATE INDEX IF NOT EXISTS idx_activity_participants_org
  ON public.activity_participants(organization_id);

ALTER TABLE public.activity_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY activity_participants_select ON public.activity_participants
  FOR SELECT USING (public.is_member_of(organization_id));

CREATE POLICY activity_participants_insert ON public.activity_participants
  FOR INSERT WITH CHECK (public.is_member_of(organization_id, 'vendedor'));

CREATE POLICY activity_participants_update ON public.activity_participants
  FOR UPDATE
  USING (public.is_member_of(organization_id, 'vendedor'))
  WITH CHECK (public.is_member_of(organization_id, 'vendedor'));

CREATE POLICY activity_participants_delete ON public.activity_participants
  FOR DELETE USING (public.is_member_of(organization_id, 'admin'));

-- =========================================
-- activities extensions
-- =========================================
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS outcome TEXT
  CHECK (outcome IS NULL OR outcome IN ('connected','voicemail','no_answer','rescheduled','completed'));

-- =========================================
-- activities search_vector
-- =========================================
-- Using trigger (not GENERATED STORED) because metadata is JSONB — requires custom function
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.activities_update_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('portuguese'::regconfig, f_unaccent(coalesce(NEW.body, ''))), 'A') ||
    setweight(to_tsvector('simple'::regconfig,     coalesce(NEW.type::text, '')), 'B') ||
    setweight(to_tsvector('portuguese'::regconfig, f_unaccent(coalesce(NEW.metadata->>'summary', ''))), 'B') ||
    setweight(to_tsvector('portuguese'::regconfig, f_unaccent(coalesce(NEW.metadata->>'subject', ''))), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activities_search_vector ON public.activities;
CREATE TRIGGER trg_activities_search_vector
  BEFORE INSERT OR UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.activities_update_search_vector();

CREATE INDEX IF NOT EXISTS idx_activities_search_gin ON public.activities USING GIN (search_vector);

-- TODO(phase4): optional backfill UPDATE activities SET id=id; to fill existing rows

