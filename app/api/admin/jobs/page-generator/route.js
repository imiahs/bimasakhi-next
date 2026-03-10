import { NextResponse } from 'next/server';
import { getPageGeneratorQueue } from '@/lib/queue/queues';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

// This API now acts purely as an edge trigger for the external Node Worker cluster
export const POST = withAdminAuth(async (request, user) => {
    try {
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            // bypass restriction temporarily logic or enforce
        }

        const pageGeneratorQueue = getPageGeneratorQueue();
        if (!pageGeneratorQueue) {
            return NextResponse.json({ error: 'Queue service unavailable.' }, { status: 503 });
        }
        const job = await pageGeneratorQueue.add('generate-batch', { limit: 500 }, { removeOnComplete: true });

        return NextResponse.json({
            success: true,
            message: 'Job successfully dispatched to BullMQ distributed queue payload.',
            jobId: job.id
        });

    } catch (error) {
        console.error('Queue Dispatch Error:', error);
        return NextResponse.json({ error: 'Internal server error allocating node job.' }, { status: 500 });
    }
});
