import { NextResponse } from 'next/server';
import { generateAiContent } from '@/lib/ai';
import { getServiceSupabase } from '@/utils/supabase';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const POST = withAdminAuth(async (request, user) => {
    try {
        const body = await request.json();
        const { page_path, page_title, page_description } = body;

        if (!page_path) {
            return NextResponse.json({ error: 'Page path is required' }, { status: 400 });
        }

        // 1. Generate AI Analysis
        const prompt = `Analyze SEO for route: ${page_path}. Current Title: ${page_title}. Current Desc: ${page_description}.`;
        const aiResult = await generateAiContent(prompt, { action: 'page-seo-analysis' });

        // Validate AI result — no random fallbacks
        // If AI returns nothing meaningful, return honest insufficient-data state
        if (!aiResult || typeof aiResult !== 'object') {
            return NextResponse.json({
                success: false,
                error: 'AI analysis returned insufficient data',
                analysis: {
                    score: null,
                    suggestions: [],
                    generated_keywords: [],
                    internal_links: [],
                    status: 'ai_unavailable'
                }
            });
        }

        const analysis = {
            score: typeof aiResult.score === 'number' ? aiResult.score : null,
            suggestions: Array.isArray(aiResult.suggestions) ? aiResult.suggestions : [],
            generated_keywords: Array.isArray(aiResult.generated_keywords) ? aiResult.generated_keywords : [],
            internal_links: Array.isArray(aiResult.internal_links) ? aiResult.internal_links : [],
            status: typeof aiResult.score === 'number' ? 'analyzed' : 'partial'
        };

        // 2. Store in Supabase seo_analysis table (only if we have real data)
        if (analysis.score !== null) {
            const supabase = getServiceSupabase();

            const { data, error } = await supabase.from('seo_analysis').insert({
                page_route: page_path,
                score: analysis.score,
                suggestions: analysis.suggestions,
                generated_keywords: analysis.generated_keywords,
                internal_links: analysis.internal_links
            }).select().single();

            if (error) {
                console.error('Failed to store SEO Analysis in Supabase:', error);
                // We can still return the analysis even if DB storage fails softly
            }
        }

        return NextResponse.json({ success: true, analysis });

    } catch (error) {
        console.error('AI SEO Analyze Route Error:', error);
        return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 });
    }
});
