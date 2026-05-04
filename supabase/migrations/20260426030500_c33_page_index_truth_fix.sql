-- C33: page_index canonical truth fix

ALTER TABLE public.page_index
    ADD COLUMN IF NOT EXISTS indexing_status TEXT,
    ADD COLUMN IF NOT EXISTS indexed_at TIMESTAMPTZ;

UPDATE public.page_index
SET status = CASE status
        WHEN 'active' THEN 'published'
        WHEN 'pending_index' THEN 'draft'
        WHEN 'disabled' THEN 'unpublished'
        WHEN 'noindex' THEN 'published'
        WHEN 'processing' THEN 'draft'
        WHEN 'published' THEN 'published'
        WHEN 'unpublished' THEN 'unpublished'
        WHEN 'archived' THEN 'archived'
        ELSE 'draft'
    END,
    indexing_status = CASE status
        WHEN 'active' THEN 'indexed'
        WHEN 'noindex' THEN 'blocked'
        WHEN 'published' THEN COALESCE(indexing_status, 'pending')
        ELSE 'blocked'
    END,
    indexed_at = CASE status
        WHEN 'active' THEN COALESCE(indexed_at, NOW())
        WHEN 'published' THEN CASE WHEN COALESCE(indexing_status, 'pending') = 'indexed' THEN COALESCE(indexed_at, NOW()) ELSE indexed_at END
        ELSE NULL
    END;

UPDATE public.page_index
SET indexing_status = CASE
        WHEN status = 'published' THEN COALESCE(indexing_status, 'pending')
        ELSE 'blocked'
    END,
    indexed_at = CASE
        WHEN status = 'published' AND COALESCE(indexing_status, 'pending') = 'indexed' THEN COALESCE(indexed_at, NOW())
        ELSE NULL
    END
WHERE indexing_status IS NULL
   OR (status <> 'published' AND indexing_status <> 'blocked')
   OR (status = 'published' AND indexing_status = 'blocked');

ALTER TABLE public.page_index
    ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.page_index
    ALTER COLUMN indexing_status SET DEFAULT 'blocked';

ALTER TABLE public.page_index
    ALTER COLUMN indexing_status SET NOT NULL;

ALTER TABLE public.page_index
    DROP CONSTRAINT IF EXISTS page_index_status_canonical_check;

ALTER TABLE public.page_index
    ADD CONSTRAINT page_index_status_canonical_check
    CHECK (status IN ('draft', 'published', 'unpublished', 'archived'));

ALTER TABLE public.page_index
    DROP CONSTRAINT IF EXISTS page_index_indexing_status_check;

ALTER TABLE public.page_index
    ADD CONSTRAINT page_index_indexing_status_check
    CHECK (indexing_status IN ('blocked', 'pending', 'indexed'));

CREATE OR REPLACE FUNCTION public.page_index_enforce_truth()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status IS NULL THEN
        NEW.status := 'draft';
    END IF;

    IF NEW.status <> 'published' THEN
        NEW.indexing_status := 'blocked';
        NEW.indexed_at := NULL;
        RETURN NEW;
    END IF;

    IF NEW.indexing_status IS NULL OR NEW.indexing_status = 'blocked' THEN
        NEW.indexing_status := 'pending';
    END IF;

    IF NEW.indexing_status = 'indexed' THEN
        NEW.indexed_at := COALESCE(NEW.indexed_at, NOW());
    ELSE
        NEW.indexed_at := NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_page_index_enforce_truth ON public.page_index;

CREATE TRIGGER trg_page_index_enforce_truth
BEFORE INSERT OR UPDATE ON public.page_index
FOR EACH ROW
EXECUTE FUNCTION public.page_index_enforce_truth();

CREATE OR REPLACE FUNCTION public.rule16_publish_draft(
    p_draft_id UUID,
    p_actor TEXT DEFAULT 'system',
    p_idempotency_key TEXT DEFAULT NULL,
    p_fail_after_step TEXT DEFAULT NULL,
    p_sleep_after_step TEXT DEFAULT NULL,
    p_sleep_seconds INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_draft public.content_drafts%ROWTYPE;
    v_page_index_id UUID;
    v_claimed BOOLEAN;
    v_result JSONB;
BEGIN
    IF p_draft_id IS NULL THEN
        RAISE EXCEPTION 'draft_id_required';
    END IF;

    v_claimed := public.rule16_claim_idempotency_key('rule16_publish_draft', p_idempotency_key);

    SELECT *
    INTO v_draft
    FROM public.content_drafts
    WHERE id = p_draft_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'draft_not_found:%', p_draft_id;
    END IF;

    PERFORM public.rule16_trace_and_maybe_fail('draft_locked', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    IF NOT v_claimed THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'idempotent_replay', TRUE,
            'draft_id', v_draft.id,
            'page_index_id', v_draft.page_index_id,
            'draft_status', v_draft.status
        );
    END IF;

    IF v_draft.status = 'published' AND v_draft.page_index_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'idempotent_replay', FALSE,
            'already_published', TRUE,
            'draft_id', v_draft.id,
            'page_index_id', v_draft.page_index_id,
            'draft_status', v_draft.status
        );
    END IF;

    IF v_draft.slug IS NULL OR btrim(v_draft.slug) = '' THEN
        RAISE EXCEPTION 'draft_slug_required:%', v_draft.id;
    END IF;

    IF v_draft.status NOT IN ('draft', 'review', 'published') THEN
        RAISE EXCEPTION 'draft_status_not_publishable:%', v_draft.status;
    END IF;

    INSERT INTO public.page_index (
        page_slug,
        page_type,
        status,
        indexing_status,
        city_id,
        locality_id,
        created_at,
        updated_at
    )
    VALUES (
        v_draft.slug,
        public.rule16_infer_page_type(v_draft.slug),
        'published',
        'pending',
        v_draft.city_id,
        v_draft.locality_id,
        v_now,
        v_now
    )
    ON CONFLICT (page_slug) DO UPDATE
    SET
        status = 'published',
        indexing_status = CASE
            WHEN public.page_index.indexing_status = 'indexed' THEN 'indexed'
            ELSE 'pending'
        END,
        updated_at = EXCLUDED.updated_at,
        city_id = COALESCE(public.page_index.city_id, EXCLUDED.city_id),
        locality_id = COALESCE(public.page_index.locality_id, EXCLUDED.locality_id)
    RETURNING id INTO v_page_index_id;

    UPDATE public.content_drafts
    SET page_index_id = v_page_index_id,
        updated_at = v_now
    WHERE id = v_draft.id
      AND page_index_id IS DISTINCT FROM v_page_index_id;

    PERFORM public.rule16_trace_and_maybe_fail('page_index_upserted', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    INSERT INTO public.location_content (
        page_index_id,
        content_level,
        city_id,
        locality_id,
        hero_headline,
        local_opportunity_description,
        faq_data,
        cta_text,
        meta_title,
        meta_description,
        word_count,
        created_at,
        updated_at
    )
    VALUES (
        v_page_index_id,
        'locality_page',
        v_draft.city_id,
        v_draft.locality_id,
        COALESCE(v_draft.hero_headline, ''),
        COALESCE(v_draft.body_content, ''),
        COALESCE(v_draft.faq_data, '[]'::jsonb),
        COALESCE(v_draft.cta_text, ''),
        COALESCE(v_draft.meta_title, ''),
        COALESCE(v_draft.meta_description, ''),
        COALESCE(v_draft.word_count, 0),
        v_now,
        v_now
    )
    ON CONFLICT (page_index_id) DO UPDATE
    SET
        city_id = EXCLUDED.city_id,
        locality_id = EXCLUDED.locality_id,
        hero_headline = EXCLUDED.hero_headline,
        local_opportunity_description = EXCLUDED.local_opportunity_description,
        faq_data = EXCLUDED.faq_data,
        cta_text = EXCLUDED.cta_text,
        meta_title = EXCLUDED.meta_title,
        meta_description = EXCLUDED.meta_description,
        word_count = EXCLUDED.word_count,
        updated_at = EXCLUDED.updated_at;

    PERFORM public.rule16_trace_and_maybe_fail('location_content_upserted', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    UPDATE public.content_drafts
    SET
        status = 'published',
        page_index_id = v_page_index_id,
        reviewer = p_actor,
        reviewed_at = v_now,
        published_at = COALESCE(published_at, v_now),
        scheduled_publish_at = NULL,
        updated_at = v_now
    WHERE id = v_draft.id;

    PERFORM public.rule16_trace_and_maybe_fail('draft_published', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    SELECT jsonb_build_object(
        'success', TRUE,
        'idempotent_replay', FALSE,
        'draft_id', d.id,
        'page_index_id', d.page_index_id,
        'draft_status', d.status,
        'page_slug', d.slug,
        'published_at', d.published_at
    )
    INTO v_result
    FROM public.content_drafts d
    WHERE d.id = v_draft.id;

    RETURN v_result;
END;
$$;