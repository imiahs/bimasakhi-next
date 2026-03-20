import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceSupabase();
    try {
        // Drip feed logic: bump 200 pending_index to active 
        const { data: toIndex } = await supabase.from('page_index')
            .select('id').eq('status', 'pending_index').limit(200);

        if (toIndex && toIndex.length > 0) {
            const ids = toIndex.map(p => p.id);
            await supabase.from('page_index').update({ status: 'active', indexed_at: new Date().toISOString() }).in('id', ids);
            return NextResponse.json({ success: true, indexed: ids.length });
        }
        return NextResponse.json({ success: true, message: 'No pages pending index.' });
    } catch(e) {
         return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
