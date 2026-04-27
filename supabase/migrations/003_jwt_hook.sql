-- 003_jwt_hook.sql
-- JWT custom claim hook: injects organization_id into every JWT.
-- After applying this migration, register in Supabase Dashboard:
--   Authentication > Hooks > Custom Access Token Hook
--   Function: public.custom_access_token_hook
--
-- The hook fires on token_refresh, so supabase.auth.refreshSession()
-- after an org switch automatically gets the updated claim.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  claims         JSONB;
  active_org_id  UUID;
BEGIN
  SELECT p.active_organization_id
    INTO active_org_id
    FROM public.profiles p
   WHERE p.id = (event->>'user_id')::UUID;

  claims := event->'claims';
  IF active_org_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{organization_id}', to_jsonb(active_org_id::TEXT));
  ELSE
    claims := claims || '{"organization_id": null}'::JSONB;
  END IF;

  RETURN jsonb_build_object('claims', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
