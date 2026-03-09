import { NextResponse } from 'next/server';
import { getCacheQueue } from '@/lib/queue/queues';

export async function POST(req) {
    try {
        const queue = getCacheQueue();
        if (!queue) return NextResponse.json({ error: 'Offline Node' }, { status: 503 });

        const job = await queue.add('pre-render-cache', {}, { removeOnComplete: true });
        return NextResponse.json({ success: true, message: 'Pre-cache instructions fired directly onto independent edge nodes.', jobId: job.id });
    } catch (error) {
        return NextResponse.json({ error: 'Route failure inside BullMQ mapping.' }, { status: 500 });
    }
}
