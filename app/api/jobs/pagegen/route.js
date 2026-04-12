import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { generateAiContent } from '@/lib/ai/generateContent';
import { getSystemPrompt, buildPagePrompt } from '@/lib/ai/promptTemplates';
import { getSystemConfig, logSystemAction } from '@/lib/systemConfig';
import crypto from 'crypto';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function validatePageGenJob(queueJob) {
    const payload = queueJob?.payload;

    if (!queueJob?.id) {
        return { valid: false, reason: 'Missing queue id' };
    }

    if (queueJob.task_type !== 'pagegen') {
        return { valid: false, reason: 'Unsupported task_type for pagegen worker' };
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
            job_class: 'pagegen',
            payload,
            status: 'processing',
            started_at: new Date().toISOString(),
            worker_id: 'pagegen-worker'
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
        await supabase.from('job_runs').update({
            status,
            failure_reason: failureReason,
            finished_at: new Date().toISOString()
        }).eq('id', jobRunId);

        if (status === 'failed') {
            await supabase.from('job_dead_letters').insert({
                job_run_id: jobRunId,
                job_class: 'pagegen',
                payload,
                failure_reason: failureReason
            });
        }
    } catch (e) {
        console.warn('[PageGen] job_runs finalize warning:', e.message);
    }
}

export async function POST(request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.QSTASH_TOKEN}`) {
        return NextResponse.json({ error: 'Unauthorized QStash Hook' }, { status: 401 });
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
            .eq('task_type', 'pagegen')
            .in('status', ['pending', 'processing'])
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (queueRes.error) {
            throw queueRes.error;
        }

        queueJob = queueRes.data;
        if (!queueJob) {
            return NextResponse.json({ success: true, message: 'No pending queue.' });
        }

        const validation = validatePageGenJob(queueJob);
        if (!validation.valid) {
            await supabase.from('generation_queue').update({
                status: 'failed',
                retry_count: (queueJob.retry_count || 0) + 1,
                completed_at: new Date().toISOString()
            }).eq('id', queueJob.id);
            await writeGenerationLog(supabase, queueJob.id, 'validation_failed', validation.reason);
            return NextResponse.json({ success: false, error: validation.reason }, { status: 422 });
        }

        if (queueJob.status !== 'processing') {
            await supabase.from('generation_queue').update({ status: 'processing' }).eq('id', queueJob.id);
        }

        jobRunId = await createJobRun(supabase, {
            queue_id: queueJob.id,
            task_type: queueJob.task_type,
            payload_version: validation.payload.version || 1
        });

        const pagesToGenerate = validation.payload.pages;
        const limit = Math.min(config.batch_size || 5, 50);
        const batchList = pagesToGenerate.slice(queueJob.progress, queueJob.progress + limit);

        if (batchList.length === 0) {
            await supabase.from('generation_queue').update({
                status: 'completed',
                completed_at: new Date().toISOString()
            }).eq('id', queueJob.id);
            await writeGenerationLog(supabase, queueJob.id, 'completed', 'No remaining pages to process');
            await finalizeJobRun(supabase, jobRunId, 'completed');
            return NextResponse.json({ success: true });
        }

        let processedCount = 0;
        let skippedCount = 0;

        for (const pageReq of batchList) {
            const pageValidation = validatePageRequest(pageReq);
            if (!pageValidation.valid) {
                skippedCount++;
                await writeGenerationLog(supabase, queueJob.id, 'page_skipped', pageValidation.reason);
                continue;
            }

            const { slug, keyword_variation_id, keyword_text, page_type, content_level } = pageReq;
            const city_id = pageReq.city_id || null;
            const locality_id = pageReq.locality_id || null;

            if (!pageReq.city_id) {
                console.warn(`[PageGen] WARNING: Missing city_id for slug ${slug}`);
            }

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

            const systemPrompt = getSystemPrompt();
            const userPrompt = buildPagePrompt({
                city: cityName,
                keyword: keyword_text,
                slug,
                audience: 'women aged 25-45 from middle-class families looking for financial independence'
            });

            const responseText = await generateAiContent(systemPrompt, userPrompt);
            if (!responseText) {
                skippedCount++;
                await writeGenerationLog(supabase, queueJob.id, 'page_skipped', `AI returned no content for ${slug}`);
                continue;
            }

            let aiContent;
            try {
                let clean = responseText.trim();
                if (clean.startsWith('```json')) clean = clean.substring(7);
                else if (clean.startsWith('```')) clean = clean.substring(3);
                if (clean.endsWith('```')) clean = clean.substring(0, clean.length - 3);
                aiContent = JSON.parse(clean.trim());
            } catch (e) {
                skippedCount++;
                await writeGenerationLog(supabase, queueJob.id, 'page_skipped', `AI JSON parse failed for ${slug}: ${e.message}`);
                continue;
            }

            const mainContent = aiContent.local_opportunity_description || '';
            const realWordCount = mainContent.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
            if (realWordCount < 200) {
                skippedCount++;
                await writeGenerationLog(supabase, queueJob.id, 'page_skipped', `Generated content too short for ${slug}: ${realWordCount}`);
                continue;
            }

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
                skippedCount++;
                await writeGenerationLog(supabase, queueJob.id, 'page_skipped', `page_index insert failed for ${slug}: ${pageInsertRes.error.message}`);
                continue;
            }

            const newPage = pageInsertRes.data;

            await supabase.from('content_fingerprints').insert({
                page_index_id: newPage.id,
                content_hash: contentHash
            }).catch((e) => console.warn('[PageGen] fingerprint insert warning:', e.message));

            const contentInsertRes = await supabase.from('location_content').insert({
                page_index_id: newPage.id,
                content_level: content_level || 'locality_page',
                city_id,
                locality_id,
                keyword_variation: keyword_text,
                hero_headline: aiContent.hero_headline || '',
                local_opportunity_description: mainContent,
                faq_data: aiContent.faq_data || [{ question: 'How to apply?', answer: 'Fill the form above.' }],
                cta_text: aiContent.cta_text || 'Apply Now',
                meta_title: aiContent.meta_title || '',
                meta_description: aiContent.meta_description || '',
                word_count: realWordCount
            });

            if (contentInsertRes.error) {
                await writeGenerationLog(supabase, queueJob.id, 'page_partial', `location_content insert failed for ${slug}: ${contentInsertRes.error.message}`);
            } else {
                await writeGenerationLog(supabase, queueJob.id, 'page_generated', `Generated ${slug}`);
            }

            processedCount++;
        }

        const newProgress = queueJob.progress + processedCount;
        const isComplete = newProgress >= pagesToGenerate.length;

        await supabase.from('generation_queue').update({
            status: isComplete ? 'completed' : 'processing',
            progress: newProgress,
            ...(isComplete ? { completed_at: new Date().toISOString() } : {})
        }).eq('id', queueJob.id);

        await finalizeJobRun(supabase, jobRunId, 'completed');
        return NextResponse.json({ success: true, processed: processedCount, skipped: skippedCount });
    } catch (e) {
        console.error('[PageGen] Cron Error:', e);

        if (queueJob?.id) {
            await supabase.from('generation_queue').update({
                status: 'failed',
                retry_count: (queueJob.retry_count || 0) + 1,
                completed_at: new Date().toISOString()
            }).eq('id', queueJob.id);
            await writeGenerationLog(supabase, queueJob.id, 'failed', e.message);
        }

        await finalizeJobRun(supabase, jobRunId, 'failed', e.message, queueJob?.payload || null);
        return NextResponse.json({ error: 'Internal Server Error', detail: e.message }, { status: 500 });
    }
}
