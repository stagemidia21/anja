-- 007_activities_skeleton.sql
-- Phase 2 Plan 01 — Activities polymorphic schema (ACTIVITY-01)
-- Skeleton only; UI and writes come in Phase 4.

CREATE TYPE activity_type AS ENUM (
  'call', 'meeting', 'email', 'whatsapp', 'note', 'task', 'stage_change', 'system'
);

CREATE TYPE activity_direction AS ENUM ('inbound', 'outbound', 'internal');

CREATE TABLE activities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type              activity_type NOT NULL,
  direction         activity_direction,
  subject_type      TEXT NOT NULL CHECK (subject_type IN ('contact', 'company', 'deal')),
  subject_id        UUID NOT NULL,
  contact_id        UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id           UUID,
  actor_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body              TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}'::JSONB,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_contact_timeline
  ON activities(organization_id, contact_id, occurred_at DESC)
  WHERE contact_id IS NOT NULL;

CREATE INDEX idx_activities_deal_timeline
  ON activities(organization_id, deal_id, occurred_at DESC)
  WHERE deal_id IS NOT NULL;

CREATE INDEX idx_activities_subject
  ON activities(organization_id, subject_type, subject_id, occurred_at DESC);

CREATE INDEX idx_activities_org_feed
  ON activities(organization_id, occurred_at DESC);

CREATE INDEX idx_activities_type
  ON activities(organization_id, type);

CREATE INDEX idx_activities_metadata_gin
  ON activities USING GIN (metadata);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY activities_select ON activities FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY activities_insert ON activities FOR INSERT WITH CHECK (is_member_of(organization_id, 'vendedor'));
CREATE POLICY activities_update ON activities FOR UPDATE
  USING (is_member_of(organization_id, 'vendedor'))
  WITH CHECK (is_member_of(organization_id, 'vendedor'));
CREATE POLICY activities_delete ON activities FOR DELETE USING (is_member_of(organization_id, 'admin'));
