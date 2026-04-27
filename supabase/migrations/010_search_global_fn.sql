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
