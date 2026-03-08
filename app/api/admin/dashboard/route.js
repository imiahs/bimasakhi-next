import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import { getLocalDb } from '@/utils/localDb';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = getServiceSupabase();

        // 1. Get blog count
        const { count: blogCount } = await supabase
            .from('blog_posts')
            .select('*', { count: 'exact', head: true });

        // 2. Get resources downloads sum
        const { data: resourcesData } = await supabase
            .from('resources')
            .select('download_count');

        const totalDownloads = resourcesData ? resourcesData.reduce((acc, curr) => acc + (curr.download_count || 0), 0) : 0;

        // 3. Get Leads count from SQLite (Active Queue) + Supabase (Synced)
        const db = getLocalDb();
        const localLeadsRow = db.prepare('SELECT COUNT(*) as count FROM lead_queue').get();
        const localLeadsCount = localLeadsRow ? localLeadsRow.count : 0;

        const { count: supabaseLeadsCount } = await supabase
            .from('lead_cache')
            .select('*', { count: 'exact', head: true });

        const totalLeads = localLeadsCount + (supabaseLeadsCount || 0);

        // 4. Get recent activity
        // Merge recent leads and recent blog posts as proxy for activity log
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
                    action: 'New Lead Synced',
                    detail: `${l.name} from ${l.city || 'Unknown'}`,
                    time: new Date(l.created_at).toLocaleString(),
                    type: 'lead',
                    timestamp: new Date(l.created_at).getTime()
                });
            });
        }

        // Add local leads to activity
        const localRecentLeads = db.prepare('SELECT name, city, created_at FROM lead_queue ORDER BY created_at DESC LIMIT 3').all();
        localRecentLeads.forEach(l => {
            activity.push({
                id: `locallead_${l.created_at}`,
                action: 'New Lead Queued',
                detail: `${l.name} from ${l.city || 'Unknown'}`,
                time: new Date(l.created_at).toLocaleString(),
                type: 'lead',
                timestamp: new Date(l.created_at).getTime()
            });
        });

        // Sort combined activity by timestamp descending and take top 5
        activity.sort((a, b) => b.timestamp - a.timestamp);
        const recentActivity = activity.slice(0, 5);

        return NextResponse.json({
            stats: {
                totalLeads,
                totalPosts: blogCount || 0,
                resourceDownloads: totalDownloads,
                conversionRate: '8.4%', // Placeholder until analytics integration
            },
            recentActivity
        });

    } catch (error) {
        console.error('API /admin/dashboard GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard metrics' }, { status: 500 });
    }
}
