CREATE TABLE IF NOT EXISTS public.content_version_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID NOT NULL REFERENCES public.content_drafts(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    saved_by TEXT NOT NULL,
    snapshot JSONB NOT NULL,
    change_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT content_version_history_draft_version_unique UNIQUE (draft_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_content_version_history_draft_created
    ON public.content_version_history (draft_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.rule16_update_content_draft(
    p_draft_id UUID,
    p_updates JSONB,
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
    v_claimed BOOLEAN;
    v_next_version INTEGER;
    v_saved_by TEXT;
    v_change_summary TEXT;
BEGIN
    IF p_draft_id IS NULL THEN
        RAISE EXCEPTION 'draft_id_required';
    END IF;

    IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'object' THEN
        RAISE EXCEPTION 'draft_updates_object_required';
    END IF;

    SELECT *
    INTO v_draft
    FROM public.content_drafts
    WHERE id = p_draft_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'draft_not_found:%', p_draft_id;
    END IF;

    IF v_draft.status NOT IN ('draft', 'review') THEN
        RAISE EXCEPTION 'draft_not_editable:%', v_draft.status;
    END IF;

    v_claimed := public.rule16_claim_idempotency_key('rule16_draft_update', p_idempotency_key);
    IF NOT v_claimed THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'idempotent_replay', TRUE,
            'draft_id', v_draft.id,
            'draft_status', v_draft.status,
            'page_index_id', v_draft.page_index_id
        );
    END IF;

    v_saved_by := COALESCE(NULLIF(p_updates ->> '__saved_by', ''), 'system');
    v_change_summary := NULLIF(p_updates ->> '__change_summary', '');

    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_version
    FROM public.content_version_history
    WHERE draft_id = v_draft.id;

    INSERT INTO public.content_version_history (
        draft_id,
        version_number,
        saved_by,
        snapshot,
        change_summary,
        created_at
    )
    VALUES (
        v_draft.id,
        v_next_version,
        v_saved_by,
        to_jsonb(v_draft),
        v_change_summary,
        v_now
    );

    UPDATE public.content_drafts
    SET
        page_title = CASE WHEN p_updates ? 'page_title' THEN p_updates ->> 'page_title' ELSE page_title END,
        meta_title = CASE WHEN p_updates ? 'meta_title' THEN p_updates ->> 'meta_title' ELSE meta_title END,
        meta_description = CASE WHEN p_updates ? 'meta_description' THEN p_updates ->> 'meta_description' ELSE meta_description END,
        hero_headline = CASE WHEN p_updates ? 'hero_headline' THEN p_updates ->> 'hero_headline' ELSE hero_headline END,
        body_content = CASE WHEN p_updates ? 'body_content' THEN p_updates ->> 'body_content' ELSE body_content END,
        faq_data = CASE WHEN p_updates ? 'faq_data' THEN COALESCE(p_updates -> 'faq_data', faq_data) ELSE faq_data END,
        cta_text = CASE WHEN p_updates ? 'cta_text' THEN p_updates ->> 'cta_text' ELSE cta_text END,
        review_notes = CASE WHEN p_updates ? 'review_notes' THEN p_updates ->> 'review_notes' ELSE review_notes END,
        status = CASE WHEN p_updates ? 'status' THEN p_updates ->> 'status' ELSE status END,
        image_prompts = CASE WHEN p_updates ? 'image_prompts' THEN COALESCE(p_updates -> 'image_prompts', image_prompts) ELSE image_prompts END,
        featured_image_url = CASE WHEN p_updates ? 'featured_image_url' THEN p_updates ->> 'featured_image_url' ELSE featured_image_url END,
        featured_image_alt = CASE WHEN p_updates ? 'featured_image_alt' THEN p_updates ->> 'featured_image_alt' ELSE featured_image_alt END,
        updated_at = v_now
    WHERE id = p_draft_id;

    PERFORM public.rule16_trace_and_maybe_fail('draft_updated', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    IF v_draft.page_index_id IS NOT NULL
       AND (
            p_updates ? 'hero_headline'
         OR p_updates ? 'meta_title'
         OR p_updates ? 'meta_description'
         OR p_updates ? 'cta_text'
         OR p_updates ? 'body_content'
         OR p_updates ? 'faq_data'
       ) THEN
        UPDATE public.location_content
        SET
            hero_headline = CASE WHEN p_updates ? 'hero_headline' THEN p_updates ->> 'hero_headline' ELSE hero_headline END,
            meta_title = CASE WHEN p_updates ? 'meta_title' THEN p_updates ->> 'meta_title' ELSE meta_title END,
            meta_description = CASE WHEN p_updates ? 'meta_description' THEN p_updates ->> 'meta_description' ELSE meta_description END,
            cta_text = CASE WHEN p_updates ? 'cta_text' THEN p_updates ->> 'cta_text' ELSE cta_text END,
            local_opportunity_description = CASE WHEN p_updates ? 'body_content' THEN p_updates ->> 'body_content' ELSE local_opportunity_description END,
            faq_data = CASE WHEN p_updates ? 'faq_data' THEN COALESCE(p_updates -> 'faq_data', faq_data) ELSE faq_data END,
            updated_at = v_now
        WHERE page_index_id = v_draft.page_index_id;

        PERFORM public.rule16_trace_and_maybe_fail('location_content_synced', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'idempotent_replay', FALSE,
        'draft_id', v_draft.id,
        'page_index_id', v_draft.page_index_id,
        'version_number', v_next_version
    );
END;
$$;