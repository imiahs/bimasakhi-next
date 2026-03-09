import { NextResponse } from 'next/server';
import { contentAuditQueue } from '@/lib/queue/queues';

export async function POST(req) {
    try {
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
}
