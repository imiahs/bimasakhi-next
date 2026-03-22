import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();

        // 1. Get blog count
        const { count: blogCount } = await supabase
            .from('blog_posts')
            .select('id', { count: 'exact', head: true });

        // 2. Get resources downloads sum
        const { data: resourcesData } = await supabase
            .from('resources')
            .select('download_count');

        const totalDownloads = resourcesData ? resourcesData.reduce((acc, curr) => acc + (curr.download_count || 0), 0) : 0;

        // 3. Get Leads count from Supabase
        const { count: supabaseLeadsCount } = await supabase
            .from('lead_cache')
            .select('id', { count: 'exact', head: true });

        const totalLeads = supabaseLeadsCount || 0;

        // --- NEW OBSERVABILITY METRICS (Phase 18) ---
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // API Traffic (Last 24hrs)
        const { count: apiRequests } = await supabase
            .from('api_requests')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', yesterday);

        // Critical Unresolved Errors
        const { count: unresolvedErrors } = await supabase
            .from('system_runtime_errors')
            .select('id', { count: 'exact', head: true })
            .eq('resolved', false);

        // Pending Sync Queue
        const { count: queueSize } = await supabase
            .from('lead_queue')
            .select('id', { count: 'exact', head: true })
            .or('synced_to_zoho.eq.false,synced_to_supabase.eq.false');

        // Total Active Agents
        const { count: activeAgents } = await supabase
            .from('agents')
            .select('id', { count: 'exact', head: true });

        // Recruitment Pipeline Size
        const { count: pipelineSize } = await supabase
            .from('recruitment_pipeline')
            .select('id', { count: 'exact', head: true });

        // SEO Indexed Pages (Published articles + templates)
        const { count: publishedPages } = await supabase
            .from('custom_pages')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'published');

        const totalSeoIndexed = (blogCount || 0) + (publishedPages || 0) + 14; // +14 static routes mapped in sitemap
        // ---------------------------------------------

        // 4. Get recent activity
        const { data: recentBlogs } = await supabase
            .from('blog_posts')
            .select('title, created_at')
            .order('created_at', { ascending: false })
            .limit(3);

        const { data: recentLeads } = await supabase
            .from('lead_cache')
            .select('name, city, created_at')
            .order('created_at', { ascending: false })
            .limit(3);

        let activity = [];

        if (recentBlogs) {
            recentBlogs.forEach(b => {
                activity.push({
                    id: `blog_${b.created_at}`,
                    action: 'New Blog Post',
                    detail: b.title,
                    time: new Date(b.created_at).toLocaleString(),
                    type: 'blog',
                    timestamp: new Date(b.created_at).getTime()
                });
            });
        }

        if (recentLeads) {
            recentLeads.forEach(l => {
                activity.push({
                    id: `lead_${l.created_at}`,
                    action: 'New Lead',
                    detail: `${l.name} from ${l.city || 'Unknown'}`,
                    time: new Date(l.created_at).toLocaleString(),
                    type: 'lead',
                    timestamp: new Date(l.created_at).getTime()
                });
            });
        }

        activity.sort((a, b) => b.timestamp - a.timestamp);
        const recentActivity = activity.slice(0, 5);

        return NextResponse.json({
            stats: {
                totalLeads,
                totalPosts: blogCount || 0,
                resourceDownloads: totalDownloads,
                apiRequests: apiRequests || 0,
                unresolvedErrors: unresolvedErrors || 0,
                queueSize: queueSize || 0,
                activeAgents: activeAgents || 0,
                pipelineSize: pipelineSize || 0,
                seoIndexed: totalSeoIndexed
            },
            recentActivity
        });

    } catch (error) {
        console.error('API /admin/dashboard GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard metrics' }, { status: 500 });
    }
});
