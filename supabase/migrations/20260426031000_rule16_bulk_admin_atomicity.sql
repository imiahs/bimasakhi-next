-- Rule 16: transactional integrity for bulk generation and admin multi-table writes

ALTER TABLE public.bulk_generation_jobs
    ADD COLUMN IF NOT EXISTS generation_queue_id UUID REFERENCES public.generation_queue(id);

CREATE INDEX IF NOT EXISTS idx_bulk_jobs_generation_queue_id
    ON public.bulk_generation_jobs(generation_queue_id)
    WHERE generation_queue_id IS NOT NULL;

ALTER TABLE public.seo_overrides
    ADD COLUMN IF NOT EXISTS og_image TEXT;

CREATE OR REPLACE FUNCTION public.rule16_write_event(
    p_event_name TEXT,
    p_payload JSONB,
    p_source TEXT,
    p_priority TEXT DEFAULT 'normal',
    p_correlation_id TEXT DEFAULT NULL,
    p_execution_context JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_event_store_id UUID;
BEGIN
    INSERT INTO public.event_store (
        event_name,
        payload,
        source,
        status,
        priority,
        retry_count,
        max_retries,
        execution_context,
        correlation_id,
        created_at,
        updated_at
    )
    VALUES (
        p_event_name,
        COALESCE(p_payload, '{}'::jsonb),
        COALESCE(p_source, 'rule16'),
        'pending',
        COALESCE(p_priority, 'normal'),
        0,
        CASE WHEN COALESCE(p_priority, 'normal') = 'critical' THEN 10 ELSE 5 END,
        p_execution_context,
        p_correlation_id,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_event_store_id;

    RETURN v_event_store_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rule16_start_bulk_generation_job(
    p_job_id UUID,
    p_pages JSONB,
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
    v_job public.bulk_generation_jobs%ROWTYPE;
    v_queue_id UUID;
    v_event_store_id UUID;
    v_claimed BOOLEAN;
    v_total_items INTEGER;
    v_payload JSONB;
    v_correlation_id TEXT;
BEGIN
    IF p_job_id IS NULL THEN
        RAISE EXCEPTION 'bulk_job_id_required';
    END IF;

    IF p_pages IS NULL OR jsonb_typeof(p_pages) <> 'array' OR jsonb_array_length(p_pages) = 0 THEN
        RAISE EXCEPTION 'bulk_pages_required';
    END IF;

    SELECT *
    INTO v_job
    FROM public.bulk_generation_jobs
    WHERE id = p_job_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'bulk_job_not_found:%', p_job_id;
    END IF;

    PERFORM public.rule16_trace_and_maybe_fail('bulk_job_locked', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    v_claimed := public.rule16_claim_idempotency_key('rule16_bulk_start', p_idempotency_key);

    IF NOT v_claimed OR (v_job.status = 'running' AND v_job.generation_queue_id IS NOT NULL) THEN
        v_queue_id := v_job.generation_queue_id;

        SELECT id
        INTO v_event_store_id
        FROM public.event_store
        WHERE event_name = 'pagegen_requested'
          AND payload ->> 'queueId' = COALESCE(v_queue_id::TEXT, '')
        ORDER BY created_at DESC
        LIMIT 1;

        RETURN jsonb_build_object(
            'success', TRUE,
            'idempotent_replay', TRUE,
            'job_id', v_job.id,
            'queue_id', v_queue_id,
            'event_store_id', v_event_store_id,
            'status', v_job.status,
            'total_items', COALESCE(v_job.total_pages, 0)
        );
    END IF;

    IF v_job.status <> 'planned' THEN
        RAISE EXCEPTION 'bulk_job_not_startable:%', v_job.status;
    END IF;

    v_total_items := jsonb_array_length(p_pages);
    v_payload := jsonb_build_object(
        'pages', p_pages,
        'bulk_job_id', p_job_id::TEXT,
        'base_keyword', v_job.base_keyword,
        'intent_type', v_job.intent_type
    );

    INSERT INTO public.generation_queue (
        task_type,
        payload,
        status,
        progress,
        total_items,
        priority,
        created_by,
        created_at,
        completed_at
    )
    VALUES (
        'pagegen',
        v_payload,
        'pending',
        0,
        v_total_items,
        1,
        COALESCE(p_actor, 'system'),
        v_now,
        NULL
    )
    RETURNING id INTO v_queue_id;

    PERFORM public.rule16_trace_and_maybe_fail('generation_queue_inserted', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    UPDATE public.bulk_generation_jobs
    SET
        status = 'running',
        total_pages = v_total_items,
        started_at = COALESCE(started_at, v_now),
        updated_at = v_now,
        generation_queue_id = v_queue_id
    WHERE id = v_job.id;

    PERFORM public.rule16_trace_and_maybe_fail('bulk_job_updated', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    v_correlation_id := 'rule16_bulk_start:' || COALESCE(NULLIF(p_idempotency_key, ''), v_queue_id::TEXT);
    v_event_store_id := public.rule16_write_event(
        'pagegen_requested',
        jsonb_build_object(
            'queueId', v_queue_id::TEXT,
            'bulk_job_id', v_job.id::TEXT,
            'event_id', COALESCE(NULLIF(p_idempotency_key, ''), v_queue_id::TEXT),
            'correlation_id', v_correlation_id
        ),
        'rule16_bulk_start',
        'normal',
        v_correlation_id,
        jsonb_build_object(
            'job_id', v_job.id::TEXT,
            'queue_id', v_queue_id::TEXT,
            'source', 'rule16_bulk_start'
        )
    );

    PERFORM public.rule16_trace_and_maybe_fail('pagegen_event_written', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    RETURN jsonb_build_object(
        'success', TRUE,
        'idempotent_replay', FALSE,
        'job_id', v_job.id,
        'queue_id', v_queue_id,
        'event_store_id', v_event_store_id,
        'status', 'running',
        'total_items', v_total_items
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.rule16_pagegen_persist_generated_page(
    p_queue_id UUID,
    p_page_request JSONB,
    p_generated_result JSONB,
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
    v_slug TEXT;
    v_page_index_id UUID;
    v_existing_page_id UUID;
    v_existing_draft_id UUID;
    v_claimed BOOLEAN;
    v_city_id UUID;
    v_locality_id UUID;
    v_keyword_variation_id UUID;
    v_bulk_job_id UUID;
    v_page_type TEXT;
    v_content_level TEXT;
    v_keyword_text TEXT;
    v_quality_score NUMERIC;
    v_generation_time_ms INTEGER;
    v_word_count INTEGER;
    v_content_hash TEXT;
    v_image_prompts JSONB;
    v_faq_data JSONB;
    v_draft_id UUID;
    v_review_required BOOLEAN := FALSE;
BEGIN
    IF p_queue_id IS NULL THEN
        RAISE EXCEPTION 'generation_queue_id_required';
    END IF;

    IF p_page_request IS NULL OR jsonb_typeof(p_page_request) <> 'object' THEN
        RAISE EXCEPTION 'page_request_object_required';
    END IF;

    IF p_generated_result IS NULL OR jsonb_typeof(p_generated_result) <> 'object' THEN
        RAISE EXCEPTION 'generated_result_object_required';
    END IF;

    v_slug := NULLIF(btrim(p_page_request ->> 'slug'), '');
    IF v_slug IS NULL THEN
        RAISE EXCEPTION 'page_slug_required';
    END IF;

    v_claimed := public.rule16_claim_idempotency_key('rule16_pagegen_persist', p_idempotency_key);

    IF NOT v_claimed THEN
        SELECT p.id, d.id
        INTO v_existing_page_id, v_existing_draft_id
        FROM public.page_index p
        LEFT JOIN public.content_drafts d
          ON d.page_index_id = p.id
        WHERE p.page_slug = v_slug
        ORDER BY d.created_at DESC NULLS LAST
        LIMIT 1;

        RETURN jsonb_build_object(
            'success', TRUE,
            'idempotent_replay', TRUE,
            'page_index_id', v_existing_page_id,
            'draft_id', v_existing_draft_id,
            'page_slug', v_slug
        );
    END IF;

    SELECT id
    INTO v_existing_page_id
    FROM public.page_index
    WHERE page_slug = v_slug
    FOR UPDATE;

    IF FOUND THEN
        SELECT id
        INTO v_existing_draft_id
        FROM public.content_drafts
        WHERE page_index_id = v_existing_page_id
        ORDER BY created_at DESC
        LIMIT 1;

        RETURN jsonb_build_object(
            'success', TRUE,
            'idempotent_replay', FALSE,
            'skipped_existing', TRUE,
            'page_index_id', v_existing_page_id,
            'draft_id', v_existing_draft_id,
            'page_slug', v_slug
        );
    END IF;

    v_city_id := NULLIF(p_page_request ->> 'city_id', '')::UUID;
    v_locality_id := NULLIF(p_page_request ->> 'locality_id', '')::UUID;
    v_keyword_variation_id := NULLIF(p_page_request ->> 'keyword_variation_id', '')::UUID;
    v_bulk_job_id := NULLIF(p_page_request ->> 'bulk_job_id', '')::UUID;
    v_page_type := COALESCE(NULLIF(p_page_request ->> 'page_type', ''), 'locality_page');
    v_content_level := COALESCE(NULLIF(p_page_request ->> 'content_level', ''), 'locality_page');
    v_keyword_text := COALESCE(p_page_request ->> 'keyword_text', '');
    v_quality_score := COALESCE(NULLIF(p_generated_result ->> 'quality_score', '')::NUMERIC, 0);
    v_generation_time_ms := COALESCE(NULLIF(p_generated_result ->> 'generation_time_ms', '')::INTEGER, 0);
    v_word_count := COALESCE(NULLIF(p_generated_result ->> 'word_count', '')::INTEGER, 0);
    v_content_hash := NULLIF(p_generated_result ->> 'content_hash', '');
    v_image_prompts := COALESCE(p_generated_result -> 'image_prompts', '{}'::jsonb);
    v_faq_data := COALESCE(p_generated_result -> 'faq_data', '[]'::jsonb);

    INSERT INTO public.page_index (
        page_slug,
        city_id,
        locality_id,
        keyword_variation_id,
        status,
        indexing_status,
        page_type,
        created_at,
        updated_at
    )
    VALUES (
        v_slug,
        v_city_id,
        v_locality_id,
        v_keyword_variation_id,
        'draft',
        'blocked',
        v_page_type,
        v_now,
        v_now
    )
    RETURNING id INTO v_page_index_id;

    PERFORM public.rule16_trace_and_maybe_fail('page_index_inserted', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    IF v_content_hash IS NOT NULL THEN
        INSERT INTO public.content_fingerprints (
            page_index_id,
            content_hash,
            created_at
        )
        VALUES (
            v_page_index_id,
            v_content_hash,
            v_now
        )
        ON CONFLICT (page_index_id) DO UPDATE
        SET content_hash = EXCLUDED.content_hash;
    END IF;

    PERFORM public.rule16_trace_and_maybe_fail('content_fingerprint_upserted', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    INSERT INTO public.location_content (
        page_index_id,
        content_level,
        city_id,
        locality_id,
        keyword_variation,
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
        v_content_level,
        v_city_id,
        v_locality_id,
        v_keyword_text,
        COALESCE(p_generated_result ->> 'hero_headline', ''),
        COALESCE(p_generated_result ->> 'local_opportunity_description', ''),
        v_faq_data,
        COALESCE(p_generated_result ->> 'cta_text', ''),
        COALESCE(p_generated_result ->> 'meta_title', ''),
        COALESCE(p_generated_result ->> 'meta_description', ''),
        v_word_count,
        v_now,
        v_now
    )
    ON CONFLICT (page_index_id) DO UPDATE
    SET
        content_level = EXCLUDED.content_level,
        city_id = EXCLUDED.city_id,
        locality_id = EXCLUDED.locality_id,
        keyword_variation = EXCLUDED.keyword_variation,
        hero_headline = EXCLUDED.hero_headline,
        local_opportunity_description = EXCLUDED.local_opportunity_description,
        faq_data = EXCLUDED.faq_data,
        cta_text = EXCLUDED.cta_text,
        meta_title = EXCLUDED.meta_title,
        meta_description = EXCLUDED.meta_description,
        word_count = EXCLUDED.word_count,
        updated_at = EXCLUDED.updated_at;

    PERFORM public.rule16_trace_and_maybe_fail('location_content_upserted', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    INSERT INTO public.content_drafts (
        generation_queue_id,
        page_index_id,
        city_id,
        locality_id,
        slug,
        page_title,
        meta_title,
        meta_description,
        hero_headline,
        body_content,
        faq_data,
        cta_text,
        word_count,
        quality_score,
        generation_time_ms,
        ai_model,
        image_prompts,
        status,
        bulk_job_id,
        featured_image_url,
        featured_image_alt,
        created_at,
        updated_at
    )
    VALUES (
        p_queue_id,
        v_page_index_id,
        v_city_id,
        v_locality_id,
        v_slug,
        COALESCE(p_generated_result ->> 'page_title', p_generated_result ->> 'hero_headline', ''),
        COALESCE(p_generated_result ->> 'meta_title', ''),
        COALESCE(p_generated_result ->> 'meta_description', ''),
        COALESCE(p_generated_result ->> 'hero_headline', ''),
        COALESCE(p_generated_result ->> 'local_opportunity_description', ''),
        v_faq_data,
        COALESCE(p_generated_result ->> 'cta_text', 'Apply Now'),
        v_word_count,
        v_quality_score,
        v_generation_time_ms,
        COALESCE(p_generated_result ->> 'ai_model', 'gemini-2.0-flash'),
        v_image_prompts,
        'draft',
        v_bulk_job_id,
        NULLIF(p_generated_result ->> 'featured_image_url', ''),
        NULLIF(p_generated_result ->> 'featured_image_alt', ''),
        v_now,
        v_now
    )
    RETURNING id INTO v_draft_id;

    PERFORM public.rule16_trace_and_maybe_fail('content_draft_inserted', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    IF v_word_count < 800 THEN
        v_review_required := TRUE;

        INSERT INTO public.content_review_queue (
            page_index_id,
            reason,
            status,
            created_at,
            updated_at
        )
        VALUES (
            v_page_index_id,
            format('Generated content requires review: %s words', v_word_count),
            'pending_review',
            v_now,
            v_now
        );

        PERFORM public.rule16_trace_and_maybe_fail('review_queue_inserted', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'idempotent_replay', FALSE,
        'skipped_existing', FALSE,
        'page_index_id', v_page_index_id,
        'draft_id', v_draft_id,
        'page_slug', v_slug,
        'review_required', v_review_required
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.rule16_finalize_generation_queue(
    p_queue_id UUID,
    p_processed_count INTEGER,
    p_total_items INTEGER,
    p_current_progress INTEGER,
    p_next_payload JSONB DEFAULT NULL,
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
    v_queue public.generation_queue%ROWTYPE;
    v_new_progress INTEGER;
    v_total_items INTEGER;
    v_is_complete BOOLEAN;
    v_event_store_id UUID := NULL;
    v_claimed BOOLEAN := TRUE;
    v_bulk_job_id UUID := NULL;
    v_next_key TEXT;
BEGIN
    IF p_queue_id IS NULL THEN
        RAISE EXCEPTION 'generation_queue_id_required';
    END IF;

    SELECT *
    INTO v_queue
    FROM public.generation_queue
    WHERE id = p_queue_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'generation_queue_not_found:%', p_queue_id;
    END IF;

    v_new_progress := GREATEST(0, COALESCE(p_current_progress, v_queue.progress, 0) + GREATEST(COALESCE(p_processed_count, 0), 0));
    v_total_items := GREATEST(COALESCE(p_total_items, v_queue.total_items, 0), v_new_progress);
    v_is_complete := v_total_items > 0 AND v_new_progress >= v_total_items;

    UPDATE public.generation_queue
    SET
        status = CASE WHEN v_is_complete THEN 'completed' ELSE 'processing' END,
        task_type = 'pagegen',
        progress = v_new_progress,
        total_items = v_total_items,
        completed_at = CASE WHEN v_is_complete THEN v_now ELSE NULL END
    WHERE id = p_queue_id;

    PERFORM public.rule16_trace_and_maybe_fail('generation_queue_updated', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    IF NULLIF(v_queue.payload ->> 'bulk_job_id', '') IS NOT NULL THEN
        v_bulk_job_id := NULLIF(v_queue.payload ->> 'bulk_job_id', '')::UUID;

        UPDATE public.bulk_generation_jobs
        SET
            generated_count = GREATEST(COALESCE(generated_count, 0), v_new_progress),
            total_pages = GREATEST(COALESCE(total_pages, 0), v_total_items),
            status = CASE WHEN v_is_complete THEN 'completed' ELSE 'running' END,
            completed_at = CASE WHEN v_is_complete THEN v_now ELSE NULL END,
            updated_at = v_now
        WHERE id = v_bulk_job_id;
    END IF;

    PERFORM public.rule16_trace_and_maybe_fail('bulk_job_progress_synced', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    IF NOT v_is_complete THEN
        v_next_key := COALESCE(NULLIF(p_idempotency_key, ''), p_queue_id::TEXT || ':' || v_new_progress::TEXT);
        v_claimed := public.rule16_claim_idempotency_key('rule16_pagegen_next', v_next_key);

        IF v_claimed THEN
            v_event_store_id := public.rule16_write_event(
                'pagegen_requested',
                COALESCE(p_next_payload, jsonb_build_object('queueId', p_queue_id::TEXT)),
                'pagegen_worker',
                'normal',
                'rule16_pagegen_next:' || v_next_key,
                jsonb_build_object(
                    'queue_id', p_queue_id::TEXT,
                    'new_progress', v_new_progress,
                    'source', 'pagegen_worker'
                )
            );
        ELSE
            SELECT id
            INTO v_event_store_id
            FROM public.event_store
            WHERE correlation_id = 'rule16_pagegen_next:' || v_next_key
            ORDER BY created_at DESC
            LIMIT 1;
        END IF;

        PERFORM public.rule16_trace_and_maybe_fail('next_pagegen_event_written', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'queue_id', p_queue_id,
        'new_progress', v_new_progress,
        'total_items', v_total_items,
        'is_complete', v_is_complete,
        'status', CASE WHEN v_is_complete THEN 'completed' ELSE 'processing' END,
        'event_store_id', v_event_store_id,
        'bulk_job_id', v_bulk_job_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.rule16_transition_draft_status(
    p_draft_id UUID,
    p_action TEXT,
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
    v_claimed BOOLEAN;
    v_next_status TEXT;
BEGIN
    IF p_draft_id IS NULL THEN
        RAISE EXCEPTION 'draft_id_required';
    END IF;

    IF p_action NOT IN ('unpublish', 'archive') THEN
        RAISE EXCEPTION 'unsupported_draft_transition:%', p_action;
    END IF;

    SELECT *
    INTO v_draft
    FROM public.content_drafts
    WHERE id = p_draft_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'draft_not_found:%', p_draft_id;
    END IF;

    v_claimed := public.rule16_claim_idempotency_key('rule16_draft_transition:' || p_action, p_idempotency_key);
    IF NOT v_claimed THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'idempotent_replay', TRUE,
            'draft_id', v_draft.id,
            'draft_status', v_draft.status,
            'page_index_id', v_draft.page_index_id
        );
    END IF;

    v_next_status := CASE p_action
        WHEN 'unpublish' THEN 'unpublished'
        WHEN 'archive' THEN 'archived'
    END;

    IF v_draft.page_index_id IS NOT NULL THEN
        UPDATE public.page_index
        SET
            status = v_next_status,
            indexing_status = 'blocked',
            updated_at = v_now
        WHERE id = v_draft.page_index_id;
    END IF;

    PERFORM public.rule16_trace_and_maybe_fail('page_index_transitioned', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    UPDATE public.content_drafts
    SET
        status = CASE WHEN p_action = 'unpublish' THEN 'draft' ELSE 'archived' END,
        published_at = CASE WHEN p_action = 'unpublish' THEN NULL ELSE published_at END,
        reviewer = COALESCE(p_actor, reviewer),
        reviewed_at = v_now,
        updated_at = v_now
    WHERE id = v_draft.id;

    PERFORM public.rule16_trace_and_maybe_fail('draft_transitioned', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    RETURN jsonb_build_object(
        'success', TRUE,
        'idempotent_replay', FALSE,
        'draft_id', v_draft.id,
        'draft_status', CASE WHEN p_action = 'unpublish' THEN 'draft' ELSE 'archived' END,
        'page_index_id', v_draft.page_index_id,
        'page_status', v_next_status
    );
END;
$$;

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
        'page_index_id', v_draft.page_index_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.rule16_update_custom_page(
    p_page_id UUID,
    p_payload JSONB,
    p_saved_by UUID DEFAULT NULL,
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
    v_page public.custom_pages%ROWTYPE;
    v_claimed BOOLEAN;
    v_current_blocks JSONB := '[]'::jsonb;
    v_blocks JSONB := COALESCE(p_payload -> 'blocks', '[]'::jsonb);
    v_next_version INTEGER;
BEGIN
    IF p_page_id IS NULL THEN
        RAISE EXCEPTION 'custom_page_id_required';
    END IF;

    IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
        RAISE EXCEPTION 'custom_page_payload_required';
    END IF;

    SELECT *
    INTO v_page
    FROM public.custom_pages
    WHERE id = p_page_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'custom_page_not_found:%', p_page_id;
    END IF;

    v_claimed := public.rule16_claim_idempotency_key('rule16_custom_page', p_idempotency_key);
    IF NOT v_claimed THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'idempotent_replay', TRUE,
            'page_id', v_page.id,
            'status', v_page.status
        );
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(pb) ORDER BY pb.block_order), '[]'::jsonb)
    INTO v_current_blocks
    FROM public.page_blocks pb
    WHERE pb.page_id = p_page_id;

    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_version
    FROM public.page_versions
    WHERE page_id = p_page_id;

    INSERT INTO public.page_versions (
        page_id,
        version_number,
        snapshot_data,
        saved_by,
        created_at
    )
    VALUES (
        p_page_id,
        v_next_version,
        jsonb_build_object(
            'title', v_page.title,
            'meta_title', v_page.meta_title,
            'meta_description', v_page.meta_description,
            'blocks', v_current_blocks
        ),
        p_saved_by,
        v_now
    );

    PERFORM public.rule16_trace_and_maybe_fail('page_version_inserted', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    UPDATE public.custom_pages
    SET
        title = CASE WHEN p_payload ? 'title' THEN p_payload ->> 'title' ELSE title END,
        meta_title = CASE WHEN p_payload ? 'meta_title' THEN p_payload ->> 'meta_title' ELSE meta_title END,
        meta_description = CASE WHEN p_payload ? 'meta_description' THEN p_payload ->> 'meta_description' ELSE meta_description END,
        status = CASE WHEN p_payload ? 'status' THEN p_payload ->> 'status' ELSE status END,
        is_campaign_page = CASE
            WHEN p_payload ? 'is_campaign_page' THEN COALESCE((p_payload ->> 'is_campaign_page')::BOOLEAN, FALSE)
            ELSE is_campaign_page
        END,
        updated_at = v_now
    WHERE id = p_page_id;

    PERFORM public.rule16_trace_and_maybe_fail('custom_page_updated', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    DELETE FROM public.page_blocks
    WHERE page_id = p_page_id;

    IF jsonb_typeof(v_blocks) = 'array' AND jsonb_array_length(v_blocks) > 0 THEN
        INSERT INTO public.page_blocks (
            page_id,
            block_type,
            block_order,
            block_data,
            created_at,
            updated_at
        )
        SELECT
            p_page_id,
            COALESCE(block.value ->> 'block_type', 'unknown'),
            block.ordinality - 1,
            COALESCE(block.value -> 'block_data', '{}'::jsonb),
            v_now,
            v_now
        FROM jsonb_array_elements(v_blocks) WITH ORDINALITY AS block(value, ordinality);
    END IF;

    PERFORM public.rule16_trace_and_maybe_fail('page_blocks_replaced', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    RETURN jsonb_build_object(
        'success', TRUE,
        'idempotent_replay', FALSE,
        'page_id', p_page_id,
        'version_number', v_next_version,
        'block_count', CASE WHEN jsonb_typeof(v_blocks) = 'array' THEN jsonb_array_length(v_blocks) ELSE 0 END
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.rule16_update_blog_post(
    p_post_id UUID,
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
    v_post public.blog_posts%ROWTYPE;
    v_claimed BOOLEAN;
BEGIN
    IF p_post_id IS NULL THEN
        RAISE EXCEPTION 'blog_post_id_required';
    END IF;

    IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'object' THEN
        RAISE EXCEPTION 'blog_post_updates_required';
    END IF;

    SELECT *
    INTO v_post
    FROM public.blog_posts
    WHERE id = p_post_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'blog_post_not_found:%', p_post_id;
    END IF;

    v_claimed := public.rule16_claim_idempotency_key('rule16_blog_post', p_idempotency_key);
    IF NOT v_claimed THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'idempotent_replay', TRUE,
            'post_id', v_post.id,
            'slug', v_post.slug
        );
    END IF;

    INSERT INTO public.blog_post_versions (
        post_id,
        title,
        content,
        meta_title,
        meta_description,
        author,
        status,
        created_at
    )
    VALUES (
        v_post.id,
        v_post.title,
        v_post.content,
        v_post.meta_title,
        v_post.meta_description,
        v_post.author,
        v_post.status,
        NOW()
    );

    PERFORM public.rule16_trace_and_maybe_fail('blog_post_versioned', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    UPDATE public.blog_posts
    SET
        slug = CASE WHEN p_updates ? 'slug' AND NULLIF(p_updates ->> 'slug', '') IS NOT NULL THEN p_updates ->> 'slug' ELSE slug END,
        title = CASE WHEN p_updates ? 'title' THEN p_updates ->> 'title' ELSE title END,
        content = CASE WHEN p_updates ? 'content' THEN p_updates ->> 'content' ELSE content END,
        meta_title = CASE WHEN p_updates ? 'meta_title' THEN p_updates ->> 'meta_title' ELSE meta_title END,
        meta_description = CASE WHEN p_updates ? 'meta_description' THEN p_updates ->> 'meta_description' ELSE meta_description END,
        author = CASE WHEN p_updates ? 'author' THEN p_updates ->> 'author' ELSE author END,
        status = CASE WHEN p_updates ? 'status' THEN p_updates ->> 'status' ELSE status END,
        views = CASE WHEN p_updates ? 'views' THEN COALESCE((p_updates ->> 'views')::INTEGER, views) ELSE views END
    WHERE id = p_post_id;

    PERFORM public.rule16_trace_and_maybe_fail('blog_post_updated', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    RETURN jsonb_build_object(
        'success', TRUE,
        'idempotent_replay', FALSE,
        'post_id', v_post.id,
        'slug', COALESCE(NULLIF(p_updates ->> 'slug', ''), v_post.slug)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.rule16_upsert_seo_override(
    p_route_path TEXT,
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
    v_existing public.seo_overrides%ROWTYPE;
    v_claimed BOOLEAN;
BEGIN
    IF p_route_path IS NULL OR btrim(p_route_path) = '' THEN
        RAISE EXCEPTION 'seo_route_path_required';
    END IF;

    IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'object' THEN
        RAISE EXCEPTION 'seo_updates_required';
    END IF;

    v_claimed := public.rule16_claim_idempotency_key('rule16_seo_override', p_idempotency_key);

    SELECT *
    INTO v_existing
    FROM public.seo_overrides
    WHERE route_path = p_route_path
    FOR UPDATE;

    IF NOT v_claimed THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'idempotent_replay', TRUE,
            'route_path', p_route_path,
            'override_id', v_existing.id
        );
    END IF;

    IF FOUND THEN
        INSERT INTO public.seo_versions (
            seo_id,
            route,
            title,
            description,
            og_title,
            og_description,
            keywords,
            created_at
        )
        VALUES (
            v_existing.id,
            v_existing.route_path,
            COALESCE(v_existing.meta_title, ''),
            COALESCE(v_existing.meta_description, ''),
            COALESCE(v_existing.meta_title, ''),
            COALESCE(v_existing.meta_description, ''),
            '',
            v_now
        );

        PERFORM public.rule16_trace_and_maybe_fail('seo_version_inserted', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

        UPDATE public.seo_overrides
        SET
            meta_title = CASE WHEN p_updates ? 'meta_title' THEN p_updates ->> 'meta_title' ELSE meta_title END,
            meta_description = CASE WHEN p_updates ? 'meta_description' THEN p_updates ->> 'meta_description' ELSE meta_description END,
            canonical_url = CASE WHEN p_updates ? 'canonical_url' THEN p_updates ->> 'canonical_url' ELSE canonical_url END,
            robots_setting = CASE WHEN p_updates ? 'robots_setting' THEN p_updates ->> 'robots_setting' ELSE robots_setting END,
            og_image = CASE WHEN p_updates ? 'og_image' THEN p_updates ->> 'og_image' ELSE og_image END,
            updated_at = v_now
        WHERE id = v_existing.id;

        PERFORM public.rule16_trace_and_maybe_fail('seo_override_updated', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

        RETURN jsonb_build_object(
            'success', TRUE,
            'idempotent_replay', FALSE,
            'override_id', v_existing.id,
            'route_path', p_route_path
        );
    END IF;

    INSERT INTO public.seo_overrides (
        route_path,
        meta_title,
        meta_description,
        canonical_url,
        robots_setting,
        og_image,
        created_at,
        updated_at
    )
    VALUES (
        p_route_path,
        p_updates ->> 'meta_title',
        p_updates ->> 'meta_description',
        p_updates ->> 'canonical_url',
        COALESCE(NULLIF(p_updates ->> 'robots_setting', ''), 'index, follow'),
        p_updates ->> 'og_image',
        v_now,
        v_now
    )
    RETURNING id INTO v_existing.id;

    PERFORM public.rule16_trace_and_maybe_fail('seo_override_inserted', p_fail_after_step, p_sleep_after_step, p_sleep_seconds);

    RETURN jsonb_build_object(
        'success', TRUE,
        'idempotent_replay', FALSE,
        'override_id', v_existing.id,
        'route_path', p_route_path
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.rule16_upsert_tool_configs(
    p_configs JSONB,
    p_tool_name TEXT DEFAULT 'calculator',
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
    v_claimed BOOLEAN;
    v_entry RECORD;
    v_existing public.tool_configs%ROWTYPE;
    v_updated_count INTEGER := 0;
BEGIN
    IF p_configs IS NULL OR jsonb_typeof(p_configs) <> 'object' OR p_configs = '{}'::jsonb THEN
        RAISE EXCEPTION 'tool_config_object_required';
    END IF;

    v_claimed := public.rule16_claim_idempotency_key('rule16_tool_configs', p_idempotency_key);
    IF NOT v_claimed THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'idempotent_replay', TRUE,
            'updated_count', jsonb_object_length(p_configs)
        );
    END IF;

    FOR v_entry IN
        SELECT key, value
        FROM jsonb_each(p_configs)
    LOOP
        SELECT *
        INTO v_existing
        FROM public.tool_configs
        WHERE config_key = v_entry.key
        FOR UPDATE;

        IF FOUND THEN
            INSERT INTO public.tool_config_versions (
                config_id,
                tool_name,
                config_key,
                config_value,
                created_at
            )
            VALUES (
                v_existing.id,
                v_existing.tool_name,
                v_existing.config_key,
                v_existing.config_value::TEXT,
                v_now
            );

            UPDATE public.tool_configs
            SET
                config_value = v_entry.value,
                updated_at = v_now
            WHERE id = v_existing.id;
        ELSE
            INSERT INTO public.tool_configs (
                tool_name,
                config_key,
                config_value,
                updated_at
            )
            VALUES (
                COALESCE(p_tool_name, 'calculator'),
                v_entry.key,
                v_entry.value,
                v_now
            );
        END IF;

        v_updated_count := v_updated_count + 1;
        PERFORM public.rule16_trace_and_maybe_fail('tool_config_applied:' || v_entry.key, p_fail_after_step, p_sleep_after_step, p_sleep_seconds);
    END LOOP;

    RETURN jsonb_build_object(
        'success', TRUE,
        'idempotent_replay', FALSE,
        'updated_count', v_updated_count
    );
END;
$$;