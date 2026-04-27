-- 014_tasks_activities_ext.sql
-- Phase 4 Plan 01 — Tasks, activity_participants, activities extensions
-- REQ: ACTIVITY-04, ACTIVITY-05, ACTIVITY-06, ACTIVITY-08, ACTIVITY-09

-- =========================================
-- tasks
-- =========================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  description     TEXT,
  type            TEXT NOT NULL DEFAULT 'task'
                    CHECK (type IN ('task','call','email','meeting','follow_up','other')),
  priority        TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high')),
  due_at          TIMESTAMPTZ,
  assignee_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_id      UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id         UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  completed_at    TIMESTAMPTZ,
  archived_at     TIMESTAMPTZ,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial indexes for performance on common queries
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_open
  ON public.tasks(organization_id, assignee_id, due_at)
  WHERE completed_at IS NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_contact
  ON public.tasks(organization_id, contact_id)
  WHERE contact_id IS NOT NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_deal
  ON public.tasks(organization_id, deal_id)
  WHERE deal_id IS NOT NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_due_at_open
  ON public.tasks(organization_id, due_at)
  WHERE completed_at IS NULL AND archived_at IS NULL;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_select ON public.tasks
  FOR SELECT USING (public.is_member_of(organization_id));

CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT WITH CHECK (public.is_member_of(organization_id, 'vendedor'));

CREATE POLICY tasks_update ON public.tasks
  FOR UPDATE
  USING (public.is_member_of(organization_id, 'vendedor'))
  WITH CHECK (public.is_member_of(organization_id, 'vendedor'));

CREATE POLICY tasks_delete ON public.tasks
  FOR DELETE USING (public.is_member_of(organization_id, 'admin'));

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Consistency: if completed_at is set, it must be >= created_at
ALTER TABLE public.tasks ADD CONSTRAINT tasks_completed_consistency
  CHECK ((completed_at IS NULL) OR (completed_at IS NOT NULL AND completed_at >= created_at));

-- =========================================
-- activity_participants
-- =========================================
CREATE TABLE IF NOT EXISTS public.activity_participants (
  activity_id     UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (activity_id, contact_id)
);

-- organization_id denormalized so RLS is_member_of() can be checked without joining activities
CREATE INDEX IF NOT EXISTS idx_activity_participants_contact
  ON public.activity_participants(contact_id);

CREATE INDEX IF NOT EXISTS idx_activity_participants_org
  ON public.activity_participants(organization_id);

ALTER TABLE public.activity_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY activity_participants_select ON public.activity_participants
  FOR SELECT USING (public.is_member_of(organization_id));

CREATE POLICY activity_participants_insert ON public.activity_participants
  FOR INSERT WITH CHECK (public.is_member_of(organization_id, 'vendedor'));

CREATE POLICY activity_participants_update ON public.activity_participants
  FOR UPDATE
  USING (public.is_member_of(organization_id, 'vendedor'))
  WITH CHECK (public.is_member_of(organization_id, 'vendedor'));

CREATE POLICY activity_participants_delete ON public.activity_participants
  FOR DELETE USING (public.is_member_of(organization_id, 'admin'));

-- =========================================
-- activities extensions
-- =========================================
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS outcome TEXT
  CHECK (outcome IS NULL OR outcome IN ('connected','voicemail','no_answer','rescheduled','completed'));

-- =========================================
-- activities search_vector
-- =========================================
-- Using trigger (not GENERATED STORED) because metadata is JSONB — requires custom function
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.activities_update_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('portuguese'::regconfig, f_unaccent(coalesce(NEW.body, ''))), 'A') ||
    setweight(to_tsvector('simple'::regconfig,     coalesce(NEW.type::text, '')), 'B') ||
    setweight(to_tsvector('portuguese'::regconfig, f_unaccent(coalesce(NEW.metadata->>'summary', ''))), 'B') ||
    setweight(to_tsvector('portuguese'::regconfig, f_unaccent(coalesce(NEW.metadata->>'subject', ''))), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activities_search_vector ON public.activities;
CREATE TRIGGER trg_activities_search_vector
  BEFORE INSERT OR UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.activities_update_search_vector();

CREATE INDEX IF NOT EXISTS idx_activities_search_gin ON public.activities USING GIN (search_vector);

-- TODO(phase4): optional backfill UPDATE activities SET id=id; to fill existing rows
