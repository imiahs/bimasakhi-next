import { NextResponse } from 'next/server';
import { runAnomalyScan } from '@/lib/monitoring/incidentDetector';
import { updateWorkerHealth } from '@/lib/monitoring/workerHealth';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const result = await runAnomalyScan();
        await updateWorkerHealth('Cron_Incident_Scanner', { jobsProcessed: Number(result.alertsFired), status: 'online' });

        return NextResponse.json({
            success: true,
            message: 'Incident detection scan completed natively.',
            details: result
        });
    } catch (error) {
        await updateWorkerHealth('Cron_Incident_Scanner', { failures: 1, status: 'crashed' });
        return NextResponse.json({ error: 'Incident Scan Failed', details: error.message }, { status: 500 });
    }
});
