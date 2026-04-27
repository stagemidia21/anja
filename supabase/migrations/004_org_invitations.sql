-- 004_org_invitations.sql
-- Invitation staging table and atomic org creation function.
-- Role is always read from this table at acceptance time, never from URL params.

CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_email   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('admin', 'vendedor', 'viewer')),
  token           TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by      UUID NOT NULL REFERENCES auth.users(id),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '48 hours',
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_org   ON public.organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.organization_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.organization_invitations(token);

ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invitations_select" ON public.organization_invitations
  FOR SELECT USING ((SELECT public.is_member_of(organization_id, 'admin')));

CREATE POLICY "invitations_insert" ON public.organization_invitations
  FOR INSERT WITH CHECK ((SELECT public.is_member_of(organization_id, 'admin')));

CREATE POLICY "invitations_delete" ON public.organization_invitations
  FOR DELETE USING ((SELECT public.is_member_of(organization_id, 'admin')));

-- Minimal pipeline tables (full business logic in Phase 3)
CREATE TABLE IF NOT EXISTS public.pipelines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at     TIMESTAMPTZ
);

ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipelines_select" ON public.pipelines
  FOR SELECT USING ((SELECT public.is_member_of(organization_id)));

CREATE POLICY "pipelines_insert" ON public.pipelines
  FOR INSERT WITH CHECK ((SELECT public.is_member_of(organization_id, 'admin')));

CREATE POLICY "pipelines_update" ON public.pipelines
  FOR UPDATE USING ((SELECT public.is_member_of(organization_id, 'admin')))
  WITH CHECK ((SELECT public.is_member_of(organization_id, 'admin')));

CREATE POLICY "pipelines_delete" ON public.pipelines
  FOR DELETE USING ((SELECT public.is_member_of(organization_id, 'admin')));

CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id          UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  organization_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  position             NUMERIC NOT NULL,
  stage_type           TEXT NOT NULL DEFAULT 'open' CHECK (stage_type IN ('open', 'won', 'lost')),
  default_probability  INTEGER NOT NULL DEFAULT 50 CHECK (default_probability BETWEEN 0 AND 100),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at          TIMESTAMPTZ
);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stages_select" ON public.pipeline_stages
  FOR SELECT USING ((SELECT public.is_member_of(organization_id)));

CREATE POLICY "stages_insert" ON public.pipeline_stages
  FOR INSERT WITH CHECK ((SELECT public.is_member_of(organization_id, 'admin')));

CREATE POLICY "stages_update" ON public.pipeline_stages
  FOR UPDATE USING ((SELECT public.is_member_of(organization_id, 'admin')))
  WITH CHECK ((SELECT public.is_member_of(organization_id, 'admin')));

CREATE POLICY "stages_delete" ON public.pipeline_stages
  FOR DELETE USING ((SELECT public.is_member_of(organization_id, 'admin')));

-- Atomic org creation: org + admin member + active org + 6 pipeline stages in one transaction
CREATE OR REPLACE FUNCTION public.create_organization(
  org_name  TEXT,
  org_slug  TEXT,
  timezone  TEXT DEFAULT 'America/Sao_Paulo',
  currency  CHAR(3) DEFAULT 'BRL'
)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_org   public.organizations;
  pipeline  UUID;
BEGIN
  INSERT INTO public.organizations (name, slug, owner_id, timezone, currency)
  VALUES (org_name, org_slug, auth.uid(), timezone, currency)
  RETURNING * INTO new_org;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org.id, auth.uid(), 'admin');

  UPDATE public.profiles
     SET active_organization_id = new_org.id
   WHERE id = auth.uid();

  INSERT INTO public.pipelines (organization_id, name, is_default)
  VALUES (new_org.id, 'Vendas', true)
  RETURNING id INTO pipeline;

  INSERT INTO public.pipeline_stages (pipeline_id, organization_id, name, position, stage_type, default_probability)
  VALUES
    (pipeline, new_org.id, 'Leads',          1, 'open', 10),
    (pipeline, new_org.id, 'Qualificação',    2, 'open', 25),
    (pipeline, new_org.id, 'Proposta',        3, 'open', 50),
    (pipeline, new_org.id, 'Negociação',      4, 'open', 75),
    (pipeline, new_org.id, 'Fechado Ganho',   5, 'won',  100),
    (pipeline, new_org.id, 'Fechado Perdido', 6, 'lost', 0);

  RETURN new_org;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_organization(TEXT, TEXT, TEXT, CHAR(3)) TO authenticated;
