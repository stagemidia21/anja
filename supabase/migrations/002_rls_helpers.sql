-- 002_rls_helpers.sql
-- Helper functions for RLS policies on all tenant-scoped tables.
-- SECURITY DEFINER prevents RLS recursion when reading organization_members.

CREATE OR REPLACE FUNCTION public.is_member_of(
  org_id        UUID,
  required_role TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = org_id
      AND om.user_id = auth.uid()
      AND (
        required_role IS NULL
        OR om.role = required_role
        OR (required_role = 'viewer'   AND om.role IN ('admin', 'vendedor', 'viewer'))
        OR (required_role = 'vendedor' AND om.role IN ('admin', 'vendedor'))
        OR (required_role = 'admin'    AND om.role = 'admin')
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_member_of(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_org_role(org_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT om.role
  FROM public.organization_members om
  WHERE om.organization_id = org_id
    AND om.user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_role(UUID) TO authenticated;
