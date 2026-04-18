import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { generateAiContent } from '@/lib/ai/generateContent';
import { getSystemPrompt, buildPagePrompt } from '@/lib/ai/promptTemplates';
import { generateImagePrompts } from '@/lib/ai/imagePrompts';
import { getSystemConfig, logSystemAction } from '@/lib/systemConfig';
import crypto from 'crypto';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { enqueuePageGeneration } from '@/lib/queue/publisher';

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

async function handler(request) {
    let body = {};
    try {
        body = await request.json();
    } catch {
        body = {};
    }
    const { queueId } = body;

    // STEP 5: Worker entry verification log
    console.log('[PAGEGEN WORKER EXECUTED]', { queueId, timestamp: new Date().toISOString() });

    if (!queueId) {
        return NextResponse.json({ error: 'Missing queueId payload from QStash' }, { status: 400 });
    }

    const config = await getSystemConfig();
    if (config.queue_paused) {
        await logSystemAction('GUARD_BLOCKED', { guard: 'queue_paused', route: '/api/jobs/pagegen' });
        return NextResponse.json({ success: true, message: 'System paused via control config.' });
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
            return NextResponse.json({ success: true, message: 'Queue job not found or already completed.' });
        }

        const validation = validatePageGenJob(queueJob);
        if (!validation.valid) {
            await markQueueFailed(supabase, queueJob, validation.reason);
            return NextResponse.json({ success: false, error: validation.reason }, { status: 422 });
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
            return NextResponse.json({ success: true });
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

            const pageInsertRes = await supabase.from('page_index').insert({
                page_slug: slug,
                city_id,
                locality_id,
                keyword_variation_id,
                status: 'pending_index',
                page_type: page_type || 'locality_page'
            }).select('id').single();

            if (pageInsertRes.error) {
                throw new Error(`page_index insert failed for ${slug}: ${pageInsertRes.error.message}`);
            }

            const newPage = pageInsertRes.data;

            try {
                await supabase.from('content_fingerprints').insert({
                    page_index_id: newPage.id,
                    content_hash: contentHash
                });

                const contentInsertRes = await supabase.from('location_content').insert({
                    page_index_id: newPage.id,
                    content_level: content_level || 'locality_page',
                    city_id,
                    locality_id,
                    keyword_variation: keyword_text,
                    hero_headline: aiContent.hero_headline || '',
                    local_opportunity_description: mainContent,
                    faq_data: aiContent.faq_data,
                    cta_text: aiContent.cta_text || 'Apply Now',
                    meta_title: aiContent.meta_title || '',
                    meta_description: aiContent.meta_description || '',
                    word_count: realWordCount
                });

                if (contentInsertRes.error) {
                    throw new Error(`location_content insert failed for ${slug}: ${contentInsertRes.error.message}`);
                }

                // Write draft for admin review (CCC Phase 2)
                const qualityScore = calculateQualityScore(aiContent, realWordCount);

                // Phase 3: Generate image prompts for the draft
                const imagePrompts = generateImagePrompts(
                    { city: cityName, locality: pageReq.locality_name || '', slug, content_type: content_level || 'local_service' },
                    { hero_headline: aiContent.hero_headline || '', meta_title: aiContent.meta_title || '' }
                );

                const { data: draftData, error: draftErr } = await supabase.from('content_drafts').insert({
                    generation_queue_id: queueJob.id,
                    page_index_id: newPage.id,
                    city_id,
                    locality_id,
                    slug,
                    page_title: aiContent.hero_headline || '',
                    meta_title: aiContent.meta_title || '',
                    meta_description: aiContent.meta_description || '',
                    hero_headline: aiContent.hero_headline || '',
                    body_content: mainContent,
                    faq_data: aiContent.faq_data,
                    cta_text: aiContent.cta_text || 'Apply Now',
                    word_count: realWordCount,
                    quality_score: qualityScore,
                    generation_time_ms: generationTimeMs,
                    ai_model: 'gemini-2.0-flash',
                    image_prompts: imagePrompts,
                    status: 'draft'
                }).select('id').single();

                if (draftErr) {
                    console.error(`[PageGen] content_drafts insert FAILED for ${slug}: ${draftErr.message} (code: ${draftErr.code})`);
                    await writeGenerationLog(supabase, queueJob.id, 'draft_insert_failed', `Draft insert failed for ${slug}: ${draftErr.message}`);
                } else {
                    console.log(`[PAGEGEN SUCCESS] slug=${slug} draftId=${draftData?.id} words=${realWordCount} quality=${qualityScore} duration=${generationTimeMs}ms`);
                }

                if (realWordCount < 800) {
                    reviewCount++;
                    await supabase.from('content_review_queue').insert({
                        page_index_id: newPage.id,
                        reason: `Generated content requires review: ${realWordCount} words`,
                        status: 'pending_review',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                    await writeGenerationLog(supabase, queueJob.id, 'page_review_required', `Generated ${slug} with ${realWordCount} words`);
                } else {
                    await writeGenerationLog(supabase, queueJob.id, 'page_generated', `Generated ${slug}`);
                }
            } catch (error) {
                await cleanupPartialPage(supabase, newPage.id);
                throw error;
            }

            processedCount++;
        }

        const newProgress = currentProgress + processedCount;
        const isComplete = newProgress >= pagesToGenerate.length;

        await supabase.from('generation_queue').update({
            status: isComplete ? 'completed' : 'processing',
            task_type: CANONICAL_TASK_TYPE,
            progress: newProgress,
            total_items: totalItems,
            ...(isComplete ? { completed_at: new Date().toISOString() } : {})
        }).eq('id', queueJob.id);

        await finalizeJobRun(supabase, jobRunId, 'completed');

        // CHAIN EXECUTION: If not complete, automatically dispatch the next QStash event!
        if (!isComplete) {
            await enqueuePageGeneration({ queueId: queueJob.id }).catch((e) => console.error("[PageGen] Chained enqueue error:", e));
        }

        return NextResponse.json({ success: true, processed: processedCount, reviews: reviewCount });
    } catch (e) {
        console.error('[PageGen] Cron Error:', e);
        await markQueueFailed(supabase, queueJob, e.message);
        await finalizeJobRun(supabase, jobRunId, 'failed', e.message, queueJob?.payload || null);
        return NextResponse.json({ error: 'Internal Server Error', detail: e.message }, { status: 500 });
    }
}

export const POST = process.env.NODE_ENV === 'development' ? handler : verifySignatureAppRouter(handler);
