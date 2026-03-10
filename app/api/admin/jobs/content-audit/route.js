import { NextResponse } from 'next/server';
import { getContentAuditQueue } from '@/lib/queue/queues';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const POST = withAdminAuth(async (request, user) => {
    try {
        const contentAuditQueue = getContentAuditQueue();
        if (!contentAuditQueue) {
            return NextResponse.json({ error: 'Queue service unavailable.' }, { status: 503 });
        }
        const job = await contentAuditQueue.add('audit-fingerprints', {}, { removeOnComplete: true });

        return NextResponse.json({
            success: true,
            message: 'Audit job actively enqueued to distributed hardware bounds safely.',
            jobId: job.id
        });
    } catch (error) {
        console.error('Audit Dispatch Error:', error);
        return NextResponse.json({ error: 'Internal server proxy allocation failure.' }, { status: 500 });
    }
});
