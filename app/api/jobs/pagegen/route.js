import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { generateAiContent } from '@/lib/ai/generateContent';
import { getSystemPrompt, buildPagePrompt } from '@/lib/ai/promptTemplates';
import { generateImagePrompts } from '@/lib/ai/imagePrompts';
import { getSystemConfig, logSystemAction } from '@/lib/systemConfig';
import { isSystemEnabled } from '@/lib/featureFlags';
import { markCompleted, markFailed } from '@/lib/events/eventStore';
import { dispatchPagegenOutbox } from '@/lib/events/dispatchPagegenOutbox';
import crypto from 'crypto';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const CANONICAL_TASK_TYPE = 'pagegen';
const LEGACY_TASK_TYPE = 'page_generation';
const REQUIRED_AI_KEYS = [
    'hero_headline',
    'local_opportunity_description',
    'meta_title',
    'meta_description',
    'cta_text',
    'faq_data'
];



function validatePageGenJob(queueJob) {
    const payload = queueJob?.payload;

    if (!queueJob?.id) {
        return { valid: false, reason: 'Missing queue id' };
    }

    if (![CANONICAL_TASK_TYPE, LEGACY_TASK_TYPE].includes(queueJob.task_type)) {
        return { valid: false, reason: `Unsupported task_type for pagegen worker: ${queueJob.task_type}` };
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return { valid: false, reason: 'Queue payload must be an object' };
    }

    if (!Array.isArray(payload.pages) || payload.pages.length === 0) {
        return { valid: false, reason: 'Queue payload.pages must be a non-empty array' };
    }

    return { valid: true, payload };
}

function validatePageRequest(pageReq) {
    if (!pageReq || typeof pageReq !== 'object') {
        return { valid: false, reason: 'Page payload must be an object' };
    }

    if (!pageReq.slug || typeof pageReq.slug !== 'string') {
        return { valid: false, reason: 'Missing page slug' };
    }

    if (!pageReq.keyword_text || typeof pageReq.keyword_text !== 'string') {
        return { valid: false, reason: `Missing keyword_text for ${pageReq.slug}` };
    }

    return { valid: true };
}

function parseAiJson(responseText) {
    let clean = responseText.trim();
    if (clean.startsWith('```json')) clean = clean.substring(7);
    else if (clean.startsWith('```')) clean = clean.substring(3);
    if (clean.endsWith('```')) clean = clean.substring(0, clean.length - 3);
    return JSON.parse(clean.trim());
}

function calculateQualityScore(aiContent, wordCount) {
    let score = 0;

    // Word count scoring (max 3.0)
    if (wordCount >= 1200) score += 3.0;
    else if (wordCount >= 1000) score += 2.5;
    else if (wordCount >= 800) score += 2.0;
    else if (wordCount >= 600) score += 1.5;
    else score += 1.0;

    // FAQ quality (max 2.0)
    const faqCount = Array.isArray(aiContent.faq_data) ? aiContent.faq_data.length : 0;
    if (faqCount >= 5) score += 2.0;
    else if (faqCount >= 3) score += 1.5;
    else if (faqCount >= 1) score += 1.0;

    // Field completeness (max 3.0)
    const fields = ['hero_headline', 'meta_title', 'meta_description', 'cta_text', 'local_opportunity_description'];
    const filledCount = fields.filter(f => aiContent[f] && aiContent[f].length > 10).length;
    score += (filledCount / fields.length) * 3.0;

    // Meta quality bonus (max 2.0)
    const metaTitle = aiContent.meta_title || '';
    const metaDesc = aiContent.meta_description || '';
    if (metaTitle.length >= 30 && metaTitle.length <= 60) score += 1.0;
    if (metaDesc.length >= 100 && metaDesc.length <= 160) score += 1.0;

    return Math.min(Math.round(score * 10) / 10, 10.0);
}

function validateGeneratedContent(slug, aiContent, wordCount) {
    for (const key of REQUIRED_AI_KEYS) {
        if (!(key in aiContent)) {
            throw new Error(`AI response missing required key "${key}" for ${slug}`);
        }
    }

    if (!Array.isArray(aiContent.faq_data) || aiContent.faq_data.length === 0) {
        throw new Error(`AI response faq_data invalid for ${slug}`);
    }

    if (wordCount < 600) {
        throw new Error(`Generated content below minimum quality threshold for ${slug}: ${wordCount}`);
    }
}

async function writeGenerationLog(supabase, queueId, eventType, message) {
    try {
        await supabase.from('generation_logs').insert({
            queue_id: queueId,
            event_type: eventType,
            message
        });
    } catch (e) {
        console.warn('[PageGen] generation_logs insert warning:', e.message);
    }
}

async function createJobRun(supabase, payload) {
    try {
        const { data } = await supabase.from('job_runs').insert({
            job_class: CANONICAL_TASK_TYPE,
            payload,
            status: 'processing',
            started_at: new Date().toISOString(),
            worker_id: 'pagegen-worker',
            completed_at: null,
            error: null
        }).select('id').single();

        return data?.id || null;
    } catch (e) {
        console.warn('[PageGen] job_runs insert warning:', e.message);
        return null;
    }
}

async function finalizeJobRun(supabase, jobRunId, status, failureReason = null, payload = null) {
    if (!jobRunId) return;

    try {
        const finishedAt = new Date().toISOString();
        await supabase.from('job_runs').update({
            status,
            failure_reason: failureReason,
            finished_at: finishedAt,
            completed_at: finishedAt,
            error: failureReason
        }).eq('id', jobRunId);

        if (status === 'failed') {
            await supabase.from('job_dead_letters').insert({
                job_run_id: jobRunId,
                job_class: CANONICAL_TASK_TYPE,
                payload,
                failure_reason: failureReason,
                error: failureReason,
                failed_at: finishedAt
            });
        }
    } catch (e) {
        console.warn('[PageGen] job_runs finalize warning:', e.message);
    }
}

async function markQueueFailed(supabase, queueJob, reason) {
    if (!queueJob?.id) return;

    const retryCount = (queueJob.retry_count || 0) + 1;
    const shouldDeadLetter = retryCount >= (queueJob.max_retries || 3);
    const nextStatus = shouldDeadLetter ? 'failed' : 'pending';

    await supabase.from('generation_queue').update({
        status: nextStatus,
        retry_count: retryCount,
        completed_at: shouldDeadLetter ? new Date().toISOString() : null
    }).eq('id', queueJob.id);

    await writeGenerationLog(
        supabase,
        queueJob.id,
        shouldDeadLetter ? 'dead_lettered' : 'retry_scheduled',
        reason
    );
}

async function cleanupPartialPage(supabase, pageId) {
    if (!pageId) return;

    await supabase.from('content_review_queue').delete().eq('page_index_id', pageId);
    await supabase.from('content_fingerprints').delete().eq('page_index_id', pageId);
    await supabase.from('location_content').delete().eq('page_index_id', pageId);
    await supabase.from('page_index').delete().eq('id', pageId);
}

export async function executePagegenJob(body = {}) {
    const { queueId, _event_store_id: currentEventStoreId = null } = body;

    // STEP 5: Worker entry verification log
    console.log('[PAGEGEN WORKER EXECUTED]', { queueId, timestamp: new Date().toISOString() });

    if (!queueId) {
        await markFailed(currentEventStoreId, 'Missing queueId payload from QStash');
        return {
            status: 400,
            body: { error: 'Missing queueId payload from QStash' },
        };
    }

    const config = await getSystemConfig();
    if (config.queue_paused) {
        await logSystemAction('GUARD_BLOCKED', { guard: 'queue_paused', route: '/api/jobs/pagegen' });
        await markFailed(currentEventStoreId, 'System paused via control config.', {
            queue_id: queueId,
            retriable: true,
            guard: 'queue_paused',
        });
        return {
            status: 503,
            body: { success: false, error: 'System paused via control config.' },
        };
    }

    // Phase 14: Feature flag + Safe Mode check
    const pagegenEnabled = await isSystemEnabled('pagegen_enabled');
    if (!pagegenEnabled) {
        await logSystemAction('GUARD_BLOCKED', { guard: 'pagegen_enabled or safe_mode', route: '/api/jobs/pagegen' });
        await markFailed(currentEventStoreId, 'Page generation disabled via feature flag or Safe Mode.', {
            queue_id: queueId,
            retriable: true,
            guard: 'pagegen_enabled_or_safe_mode',
        });
        return {
            status: 503,
            body: { success: false, error: 'Page generation disabled via feature flag or Safe Mode.' },
        };
    }

    const supabase = getServiceSupabase();
    let queueJob = null;
    let jobRunId = null;

    try {
        const queueRes = await supabase.from('generation_queue')
            .select('*')
            .eq('id', queueId)
            .maybeSingle();

        if (queueRes.error) {
            throw queueRes.error;
        }

        queueJob = queueRes.data;
        if (!queueJob || queueJob.status === 'completed') {
            await markCompleted(currentEventStoreId, { queue_id: queueId, skipped: true, reason: 'queue_missing_or_completed' });
            return {
                status: 200,
                body: { success: true, message: 'Queue job not found or already completed.' },
            };
        }

        const validation = validatePageGenJob(queueJob);
        if (!validation.valid) {
            await markQueueFailed(supabase, queueJob, validation.reason);
            await markFailed(currentEventStoreId, validation.reason, { queue_id: queueJob.id, payload: queueJob.payload || null });
            return {
                status: 422,
                body: { success: false, error: validation.reason },
            };
        }

        const totalItems = validation.payload.pages.length;
        const queueUpdates = {
            status: 'processing',
            total_items: totalItems
        };
        if (queueJob.task_type !== CANONICAL_TASK_TYPE) {
            queueUpdates.task_type = CANONICAL_TASK_TYPE;
        }
        await supabase.from('generation_queue').update(queueUpdates).eq('id', queueJob.id);

        jobRunId = await createJobRun(supabase, {
            queue_id: queueJob.id,
            task_type: CANONICAL_TASK_TYPE,
            payload_version: validation.payload.version || 1
        });

        const pagesToGenerate = validation.payload.pages;
        const limit = 1; // Process exactly one page per QStash event
        const currentProgress = queueJob.progress || 0;
        const batchList = pagesToGenerate.slice(currentProgress, currentProgress + limit);

        if (batchList.length === 0) {
            await supabase.from('generation_queue').update({
                status: 'completed',
                total_items: totalItems,
                completed_at: new Date().toISOString()
            }).eq('id', queueJob.id);
            await writeGenerationLog(supabase, queueJob.id, 'completed', 'No remaining pages to process');
            await finalizeJobRun(supabase, jobRunId, 'completed');
            await markCompleted(currentEventStoreId, {
                queue_id: queueJob.id,
                processed: 0,
                reviews: 0,
                new_progress: totalItems,
                complete: true,
                dispatch_deferred: false,
                reason: 'no_remaining_pages',
            });
            return {
                status: 200,
                body: { success: true },
            };
        }

        let processedCount = 0;
        let reviewCount = 0;

        for (const pageReq of batchList) {
            const pageValidation = validatePageRequest(pageReq);
            if (!pageValidation.valid) {
                throw new Error(pageValidation.reason);
            }

            const { slug, keyword_variation_id, keyword_text, page_type, content_level } = pageReq;
            const city_id = pageReq.city_id || null;
            const locality_id = pageReq.locality_id || null;

            const existingPageRes = await supabase.from('page_index').select('id').eq('page_slug', slug).maybeSingle();
            if (existingPageRes.error) {
                throw existingPageRes.error;
            }

            if (existingPageRes.data) {
                processedCount++;
                await writeGenerationLog(supabase, queueJob.id, 'page_skipped', `Page already exists: ${slug}`);
                continue;
            }

            const cityName = pageReq.city_name ||
                keyword_text.split(' in ').pop()?.trim() ||
                slug.replace(/lic-agent-in-/, '').replace(/-\d+$/, '').replace(/-/g, ' ') ||
                'your city';

            const aiStartTime = Date.now();
            const responseText = await generateAiContent(
                getSystemPrompt(),
                buildPagePrompt({
                    city: cityName,
                    keyword: keyword_text,
                    slug,
                    audience: 'women aged 25-45 from middle-class families looking for financial independence'
                })
            );
            const generationTimeMs = Date.now() - aiStartTime;

            if (!responseText) {
                throw new Error(`AI returned no content for ${slug}`);
            }

            let aiContent;
            try {
                aiContent = parseAiJson(responseText);
            } catch (error) {
                throw new Error(`AI JSON parse failed for ${slug}: ${error.message}`);
            }

            const mainContent = aiContent.local_opportunity_description || '';
            const realWordCount = mainContent.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
            validateGeneratedContent(slug, aiContent, realWordCount);

            const contentStr = `${aiContent.hero_headline || ''} ${mainContent}`;
            const contentHash = crypto.createHash('sha256').update(contentStr).digest('hex');

            const qualityScore = calculateQualityScore(aiContent, realWordCount);

            const imagePrompts = generateImagePrompts(
                { city: cityName, locality: pageReq.locality_name || '', slug, content_type: content_level || 'local_service' },
                { hero_headline: aiContent.hero_headline || '', meta_title: aiContent.meta_title || '' }
            );

            const persistKey = crypto
                .createHash('sha256')
                .update(JSON.stringify({ queueId: queueJob.id, slug, contentHash }))
                .digest('hex');

            const { data: persistResult, error: persistErr } = await supabase.rpc('rule16_pagegen_persist_generated_page', {
                p_queue_id: queueJob.id,
                p_page_request: pageReq,
                p_generated_result: {
                    page_title: aiContent.hero_headline || '',
                    hero_headline: aiContent.hero_headline || '',
                    local_opportunity_description: mainContent,
                    faq_data: aiContent.faq_data,
                    cta_text: aiContent.cta_text || 'Apply Now',
                    meta_title: aiContent.meta_title || '',
                    meta_description: aiContent.meta_description || '',
                    word_count: realWordCount,
                    quality_score: qualityScore,
                    generation_time_ms: generationTimeMs,
                    ai_model: 'gemini-2.0-flash',
                    image_prompts: imagePrompts,
                    content_hash: contentHash,
                },
                p_idempotency_key: persistKey,
            });

            if (persistErr) {
                throw new Error(`page persistence failed for ${slug}: ${persistErr.message}`);
            }

            if (persistResult.skipped_existing) {
                await writeGenerationLog(supabase, queueJob.id, 'page_skipped', `Page already exists: ${slug}`);
            } else {
                console.log(`[PAGEGEN SUCCESS] slug=${slug} draftId=${persistResult?.draft_id} words=${realWordCount} quality=${qualityScore} duration=${generationTimeMs}ms`);
                if (persistResult.review_required) {
                    reviewCount++;
                    await writeGenerationLog(supabase, queueJob.id, 'page_review_required', `Generated ${slug} with ${realWordCount} words`);
                } else {
                    await writeGenerationLog(supabase, queueJob.id, 'page_generated', `Generated ${slug}`);
                }
            }

            processedCount++;
        }

        const nextProgress = currentProgress + processedCount;
        const finalizeKey = `${queueJob.id}:${nextProgress}`;
        const { data: finalizeResult, error: finalizeErr } = await supabase.rpc('rule16_finalize_generation_queue', {
            p_queue_id: queueJob.id,
            p_processed_count: processedCount,
            p_total_items: totalItems,
            p_current_progress: currentProgress,
            p_next_payload: { queueId: queueJob.id },
            p_idempotency_key: finalizeKey,
        });

        if (finalizeErr) {
            throw finalizeErr;
        }

        await finalizeJobRun(supabase, jobRunId, 'completed');

        let dispatchDeferred = false;
        if (finalizeResult.event_store_id) {
            const dispatchResult = await dispatchPagegenOutbox(
                finalizeResult.event_store_id,
                { queueId: queueJob.id },
                { queue_id: queueJob.id, progress: finalizeResult.new_progress, source: 'pagegen_next' }
            );
            dispatchDeferred = !dispatchResult.success;
        }

        await markCompleted(currentEventStoreId, {
            queue_id: queueJob.id,
            processed: processedCount,
            reviews: reviewCount,
            new_progress: finalizeResult.new_progress,
            complete: finalizeResult.is_complete,
            dispatch_deferred: dispatchDeferred,
        });

        return {
            status: 200,
            body: {
                success: true,
                processed: processedCount,
                reviews: reviewCount,
                dispatch_deferred: dispatchDeferred,
            },
        };
    } catch (e) {
        console.error('[PageGen] Cron Error:', e);
        await markQueueFailed(supabase, queueJob, e.message);
        await finalizeJobRun(supabase, jobRunId, 'failed', e.message, queueJob?.payload || null);
        await markFailed(currentEventStoreId, e.message, { queue_id: queueJob?.id || queueId, payload: queueJob?.payload || null });
        return {
            status: 500,
            body: { error: 'Internal Server Error', detail: e.message },
        };
    }
}

async function handler(request) {
    let body = {};
    try {
        body = await request.json();
    } catch {
        body = {};
    }

    const result = await executePagegenJob(body);
    return NextResponse.json(result.body, { status: result.status });
}

export const POST = process.env.NODE_ENV === 'development' ? handler : verifySignatureAppRouter(handler);
