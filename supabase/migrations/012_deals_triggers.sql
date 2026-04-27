-- 012_deals_triggers.sql
-- Phase 3 Plan 01 — Triggers de stage_change + last_activity_at
-- ACTIVITY-11 (stage_change) + DEAL-03 (fonte unica da verdade no banco)

-- =========================================
-- log_deal_stage_change
-- Dispara quando deals.stage_id muda em UPDATE e insere activity type='stage_change'
-- com metadata {from_stage_id, to_stage_id, changed_by}.
-- SECURITY DEFINER para contornar RLS de activities (trigger roda no contexto do banco).
-- =========================================
CREATE OR REPLACE FUNCTION public.log_deal_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor UUID;
BEGIN
  -- Apenas dispara quando stage_id muda de fato
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    actor := auth.uid();
    INSERT INTO public.activities (
      organization_id,
      type,
      direction,
      subject_type,
      subject_id,
      deal_id,
      contact_id,
      actor_id,
      body,
      metadata,
      occurred_at
    ) VALUES (
      NEW.organization_id,
      'stage_change',
      'internal',
      'deal',
      NEW.id,
      NEW.id,
      NEW.contact_id,
      actor,
      NULL,
      jsonb_build_object(
        'from_stage_id', OLD.stage_id,
        'to_stage_id',   NEW.stage_id,
        'changed_by',    actor
      ),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deals_stage_change
  AFTER UPDATE OF stage_id ON public.deals
  FOR EACH ROW
  WHEN (OLD.stage_id IS DISTINCT FROM NEW.stage_id)
  EXECUTE FUNCTION public.log_deal_stage_change();

-- =========================================
-- touch_deal_last_activity
-- Quando nova activity referencia um deal, atualiza deals.last_activity_at
-- Evita recursao porque esta fonte e INSERT em activities, nao UPDATE em deals.stage_id
-- =========================================
CREATE OR REPLACE FUNCTION public.touch_deal_last_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.deal_id IS NOT NULL THEN
    UPDATE public.deals
       SET last_activity_at = GREATEST(COALESCE(last_activity_at, 'epoch'::TIMESTAMPTZ), NEW.occurred_at)
     WHERE id = NEW.deal_id
       AND organization_id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activities_touch_deal
  AFTER INSERT ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_deal_last_activity();
