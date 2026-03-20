import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const PUT = withAdminAuth(async (request) => {
    try {
        const supabase = getServiceSupabase();
        const { action } = await request.json();

        if (action === 'pause') {
            await supabase.from('generation_queue').update({ status: 'paused' }).eq('status', 'pending');
        } else if (action === 'resume') {
            await supabase.from('generation_queue').update({ status: 'pending' }).eq('status', 'paused');
        } else if (action === 'clear') {
            await supabase.from('generation_queue').delete().in('status', ['pending', 'paused']);
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({ success: true, action });
    } catch (error) {
        console.error('Queue API Error:', error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }
});
