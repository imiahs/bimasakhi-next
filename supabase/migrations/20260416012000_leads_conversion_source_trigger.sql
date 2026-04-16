-- Phase 4.6 follow-up: guarantee conversion_source on live lead inserts
-- Safe and additive only. Preserves provided values and fills missing ones.

CREATE OR REPLACE FUNCTION public.set_leads_conversion_source()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.conversion_source := COALESCE(
        NULLIF(BTRIM(NEW.conversion_source), ''),
        NULLIF(BTRIM(NEW.source), ''),
        'website_form'
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_leads_conversion_source ON public.leads;

CREATE TRIGGER trg_set_leads_conversion_source
BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.set_leads_conversion_source();

NOTIFY pgrst, 'reload schema';
