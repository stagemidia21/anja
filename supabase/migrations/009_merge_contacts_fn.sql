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
