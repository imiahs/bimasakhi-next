import { NextResponse } from 'next/server';
import { getIndexQueue } from '@/lib/queue/queues';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const POST = withAdminAuth(async (request, user) => {
    try {
        const queue = getIndexQueue();
        if (!queue) return NextResponse.json({ error: 'Offline Node' }, { status: 503 });

        const job = await queue.add('promote-pages', {}, { removeOnComplete: true });
        return NextResponse.json({ success: true, message: 'Index bounds delegated to BullMQ successfully.', jobId: job.id });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server routing boundary crash.' }, { status: 500 });
    }
});
