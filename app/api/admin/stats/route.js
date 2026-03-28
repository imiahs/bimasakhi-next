import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || 'today';
        
        const supabase = getServiceSupabase();
        const now = new Date();
        const rangeStart = new Date(now);

        if (range === '7d') {
            rangeStart.setDate(now.getDate() - 7);
        } else if (range === '30d') {
            rangeStart.setDate(now.getDate() - 30);
        } else {
            rangeStart.setHours(0, 0, 0, 0);
        }
        
        // Very basic mock query since tmp-admin-data wasn't fully restored, 
        // to conform to InsightsTab expectation of stats
        const { data, error } = await supabase
            .from('leads')
            .select('source')
            .gte('created_at', rangeStart.toISOString());
            
        let totalApplications = 0;
        let attributionMap = {};
        
        if (!error && data) {
            totalApplications = data.length;
            data.forEach(lead => {
                const src = lead.source || 'Website (Direct)';
                attributionMap[src] = (attributionMap[src] || 0) + 1;
            });
        }
        
        const attribution = Object.keys(attributionMap).map(source => ({
            source,
            count: attributionMap[source]
        })).sort((a, b) => b.count - a.count);

        return NextResponse.json({
            totalApplications,
            attribution
        });
    } catch (error) {
        console.error('API /admin/stats GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
});
