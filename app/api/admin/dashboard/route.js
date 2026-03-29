import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
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

        // 3. Get Leads count from source-of-truth table
        const { count: supabaseLeadsCount } = await supabase
            .from('leads')
            .select('id', { count: 'exact', head: true });

        const totalLeads = supabaseLeadsCount || 0;

        const { count: convertedLeads } = await supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'converted');

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
            .from('generation_queue')
            .select('id', { count: 'exact', head: true })
            .in('status', ['pending', 'processing', 'failed']);

        // Total Active Agents
        const { count: activeAgents } = await supabase
            .from('agents')
            .select('id', { count: 'exact', head: true });

        // Recruitment Pipeline Size
        const { count: pipelineSize } = await supabase
            .from('recruitment_pipeline')
            .select('id', { count: 'exact', head: true });

        // SEO Indexed Pages
        const { count: publishedPages } = await supabase
            .from('page_index')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active');

        const totalSeoIndexed = publishedPages || 0;
        // ---------------------------------------------

        // 4. Get recent activity
        const { data: recentBlogs } = await supabase
            .from('blog_posts')
            .select('title, created_at')
            .order('created_at', { ascending: false })
            .limit(3);

        const { data: recentLeads } = await supabase
            .from('leads')
            .select('full_name, city, created_at')
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
                    detail: `${l.full_name || 'Unknown'} from ${l.city || 'Unknown'}`,
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
                conversionRate: totalLeads > 0 ? `${((convertedLeads || 0) / totalLeads * 100).toFixed(1)}%` : '0%',
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
