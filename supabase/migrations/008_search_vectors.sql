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
