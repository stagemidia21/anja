-- 001_tenant_schema.sql
-- Core multi-tenant tables for CRM Anja.
-- IMPORTANT: profiles and oauth_tokens already exist (shared with Anja).
-- Only ADD COLUMN to profiles — never recreate it.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_organization_id UUID;

CREATE TABLE IF NOT EXISTS public.organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  owner_id      UUID NOT NULL REFERENCES auth.users(id),
  plan          TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'solo', 'agencia', 'enterprise')),
  timezone      TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  currency      CHAR(3) NOT NULL DEFAULT 'BRL',
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at   TIMESTAMPTZ
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_profiles_active_org'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT fk_profiles_active_org
      FOREIGN KEY (active_organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.organization_members (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('admin', 'vendedor', 'viewer')),
  invited_by      UUID REFERENCES auth.users(id),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgs_select" ON public.organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "orgs_insert" ON public.organizations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "orgs_update" ON public.organizations
  FOR UPDATE USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "orgs_delete" ON public.organizations
  FOR DELETE USING (owner_id = auth.uid());

-- NO RLS on organization_members — is_member_of() is SECURITY DEFINER
-- and reads this table without going through RLS to avoid infinite recursion.
