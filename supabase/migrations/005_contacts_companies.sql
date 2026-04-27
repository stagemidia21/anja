-- 005_contacts_companies.sql
-- Phase 2 Plan 01 — Contacts + Companies + N:M link table

-- contacts
CREATE TABLE contacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name         TEXT NOT NULL CHECK (length(full_name) BETWEEN 1 AND 200),
  email             TEXT,
  phone             TEXT,
  phone_e164        TEXT CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[0-9]{10,15}$'),
  cpf               TEXT CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$'),
  job_title         TEXT,
  tags              TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  owner_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  custom_fields     JSONB NOT NULL DEFAULT '{}'::JSONB,
  merged_into_id    UUID REFERENCES contacts(id) ON DELETE SET NULL,
  archived_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_contacts_email_org
  ON contacts(organization_id, lower(email))
  WHERE email IS NOT NULL AND archived_at IS NULL;

CREATE UNIQUE INDEX uq_contacts_phone_org
  ON contacts(organization_id, phone_e164)
  WHERE phone_e164 IS NOT NULL AND archived_at IS NULL;

CREATE INDEX idx_contacts_org_active ON contacts(organization_id) WHERE archived_at IS NULL;
CREATE INDEX idx_contacts_owner ON contacts(organization_id, owner_id) WHERE archived_at IS NULL;
CREATE INDEX idx_contacts_tags_gin ON contacts USING GIN (tags);
CREATE INDEX idx_contacts_custom_fields_gin ON contacts USING GIN (custom_fields);
CREATE INDEX idx_contacts_created_at ON contacts(organization_id, created_at DESC) WHERE archived_at IS NULL;

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contacts_select ON contacts FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY contacts_insert ON contacts FOR INSERT WITH CHECK (is_member_of(organization_id, 'vendedor'));
CREATE POLICY contacts_update ON contacts FOR UPDATE
  USING (is_member_of(organization_id, 'vendedor'))
  WITH CHECK (is_member_of(organization_id, 'vendedor'));
CREATE POLICY contacts_delete ON contacts FOR DELETE USING (is_member_of(organization_id, 'admin'));

-- companies
CREATE TABLE companies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  domain            TEXT,
  cnpj              TEXT CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$'),
  industry          TEXT,
  size              TEXT,
  tags              TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  owner_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  custom_fields     JSONB NOT NULL DEFAULT '{}'::JSONB,
  archived_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_companies_cnpj_org
  ON companies(organization_id, cnpj)
  WHERE cnpj IS NOT NULL AND archived_at IS NULL;

CREATE UNIQUE INDEX uq_companies_domain_org
  ON companies(organization_id, lower(domain))
  WHERE domain IS NOT NULL AND archived_at IS NULL;

CREATE INDEX idx_companies_org_active ON companies(organization_id) WHERE archived_at IS NULL;
CREATE INDEX idx_companies_tags_gin ON companies USING GIN (tags);
CREATE INDEX idx_companies_custom_fields_gin ON companies USING GIN (custom_fields);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY companies_select ON companies FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY companies_insert ON companies FOR INSERT WITH CHECK (is_member_of(organization_id, 'vendedor'));
CREATE POLICY companies_update ON companies FOR UPDATE
  USING (is_member_of(organization_id, 'vendedor'))
  WITH CHECK (is_member_of(organization_id, 'vendedor'));
CREATE POLICY companies_delete ON companies FOR DELETE USING (is_member_of(organization_id, 'admin'));

-- contact_company_links (N:M with role + is_primary)
CREATE TABLE contact_company_links (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id        UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role              TEXT,
  is_primary        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contact_id, company_id)
);

CREATE UNIQUE INDEX uq_contact_primary_company
  ON contact_company_links(contact_id)
  WHERE is_primary = TRUE;

CREATE INDEX idx_ccl_contact ON contact_company_links(contact_id);
CREATE INDEX idx_ccl_company ON contact_company_links(company_id);
CREATE INDEX idx_ccl_org ON contact_company_links(organization_id);

ALTER TABLE contact_company_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY ccl_select ON contact_company_links FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY ccl_insert ON contact_company_links FOR INSERT WITH CHECK (is_member_of(organization_id, 'vendedor'));
CREATE POLICY ccl_update ON contact_company_links FOR UPDATE
  USING (is_member_of(organization_id, 'vendedor'))
  WITH CHECK (is_member_of(organization_id, 'vendedor'));
CREATE POLICY ccl_delete ON contact_company_links FOR DELETE USING (is_member_of(organization_id, 'vendedor'));

-- updated_at trigger helper (shared)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- CONTACT-05: when phone is set, phone_e164 must also be set.
-- Server action normalizes via libphonenumber-js; this trigger blocks any bypass (direct insert, migration script, future trigger).
CREATE OR REPLACE FUNCTION check_phone_e164_required()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone_e164 IS NULL THEN
    RAISE EXCEPTION 'phone_e164_required: phone_e164 must be set when phone is set'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contacts_phone_e164
  BEFORE INSERT OR UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION check_phone_e164_required();
