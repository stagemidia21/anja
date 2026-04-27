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
