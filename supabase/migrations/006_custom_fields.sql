-- 006_custom_fields.sql
-- Phase 2 Plan 01 — Custom field definitions (cap 15 per org/scope)

CREATE TYPE custom_field_type AS ENUM ('text', 'number', 'date', 'select', 'multiselect', 'boolean');
CREATE TYPE custom_field_scope AS ENUM ('contact', 'company', 'deal');

CREATE TABLE custom_field_definitions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scope             custom_field_scope NOT NULL,
  key               TEXT NOT NULL CHECK (key ~ '^[a-z][a-z0-9_]{0,49}$'),
  label             TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 60),
  type              custom_field_type NOT NULL,
  options           JSONB,
  required          BOOLEAN NOT NULL DEFAULT FALSE,
  position          INTEGER NOT NULL DEFAULT 0,
  archived_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, scope, key)
);

CREATE INDEX idx_cfd_org_scope
  ON custom_field_definitions(organization_id, scope, position)
  WHERE archived_at IS NULL;

CREATE OR REPLACE FUNCTION enforce_custom_field_cap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM custom_field_definitions
  WHERE organization_id = NEW.organization_id
    AND scope = NEW.scope
    AND archived_at IS NULL;

  IF active_count >= 15 THEN
    RAISE EXCEPTION 'max_custom_fields_exceeded: org % scope % already has 15 active fields',
      NEW.organization_id, NEW.scope
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_custom_field_cap
  BEFORE INSERT ON custom_field_definitions
  FOR EACH ROW
  WHEN (NEW.archived_at IS NULL)
  EXECUTE FUNCTION enforce_custom_field_cap();

CREATE TRIGGER trg_cfd_updated_at
  BEFORE UPDATE ON custom_field_definitions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY cfd_select ON custom_field_definitions FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY cfd_insert ON custom_field_definitions FOR INSERT WITH CHECK (is_member_of(organization_id, 'admin'));
CREATE POLICY cfd_update ON custom_field_definitions FOR UPDATE
  USING (is_member_of(organization_id, 'admin'))
  WITH CHECK (is_member_of(organization_id, 'admin'));
CREATE POLICY cfd_delete ON custom_field_definitions FOR DELETE USING (is_member_of(organization_id, 'admin'));
