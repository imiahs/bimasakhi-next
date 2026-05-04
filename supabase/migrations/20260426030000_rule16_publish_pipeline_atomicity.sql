-- Rule 16: Publish pipeline atomicity foundation

CREATE OR REPLACE FUNCTION public.rule16_trace_and_maybe_fail(
    p_step TEXT,
    p_fail_after_step TEXT DEFAULT NULL,
    p_sleep_after_step TEXT DEFAULT NULL,
    p_sleep_seconds INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE NOTICE 'rule16_step:%', p_step;

    IF p_sleep_after_step IS NOT NULL AND p_sleep_after_step = p_step AND p_sleep_seconds > 0 THEN
        PERFORM pg_sleep(p_sleep_seconds);
    END IF;

    IF p_fail_after_step IS NOT NULL AND p_fail_after_step = p_step THEN
        RAISE EXCEPTION 'rule16_forced_failure:%', p_step;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rule16_claim_idempotency_key(
    p_scope TEXT,
    p_idempotency_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_rows INTEGER := 0;
BEGIN
    IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
        RETURN TRUE;
    END IF;

    INSERT INTO public.idempotency_keys (idempotency_key, scope, event_id)
    VALUES (p_scope || ':' || p_idempotency_key, p_scope, p_idempotency_key)
    ON CONFLICT (idempotency_key) DO NOTHING;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.rule16_infer_page_type(p_slug TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_parts TEXT[];
BEGIN
    IF p_slug IS NULL OR btrim(p_slug) = '' THEN
        RETURN 'custom_page';
    END IF;

    IF p_slug LIKE 'blog/%' OR p_slug LIKE 'blog-%' THEN
        RETURN 'blog';
    END IF;

    IF p_slug LIKE 'policy/%' OR p_slug LIKE 'policy-%' THEN
        RETURN 'policy_page';
    END IF;

    IF p_slug LIKE 'become-lic-agent%' OR p_slug LIKE 'career%' THEN
        RETURN 'career_page';
    END IF;

    IF p_slug LIKE 'forms/%' OR p_slug LIKE 'download%' THEN
        RETURN 'resource_page';
    END IF;

    IF p_slug LIKE 'lic-agent%' THEN
        v_parts := regexp_split_to_array(regexp_replace(p_slug, '^/+', ''), '[/-]');
        IF array_length(v_parts, 1) >= 4 THEN
            RETURN 'locality_page';
        END IF;
        IF array_length(v_parts, 1) >= 3 THEN
            RETURN 'city_page';
        END IF;
        RETURN 'service_page';
    END IF;

    RETURN 'custom_page';
END;
$$;

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
        city_id,
        locality_id,
        created_at,
        updated_at
    )
    VALUES (
        v_draft.slug,
        public.rule16_infer_page_type(v_draft.slug),
        'active',
        v_draft.city_id,
        v_draft.locality_id,
        v_now,
        v_now
    )
    ON CONFLICT (page_slug) DO UPDATE
    SET
        status = 'active',
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