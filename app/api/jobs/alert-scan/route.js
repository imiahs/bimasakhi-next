import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { runAlertScan } from '@/lib/monitoring/alertSystem';
import { evaluateRunbooks } from '@/lib/monitoring/runbooks';

export const maxDuration = 30;

/**
 * ALERT SCAN JOB — Scheduled via QStash cron (every 5 minutes).
 * 
 * 1. Runs all alert rules (detect, dedup, persist, notify)
 * 2. Evaluates runbooks (auto-remediation for known incidents)
 * 
 * QStash Schedule:
 *   URL: https://bimasakhi.com/api/jobs/alert-scan
 *   Cron: every 5 minutes
 */
async function handler() {
    try {
        const [alertResult, runbookResult] = await Promise.all([
            runAlertScan(),
            evaluateRunbooks(),
        ]);

        return NextResponse.json({
            success: true,
            alerts: alertResult,
            runbooks: runbookResult,
        });
    } catch (err) {
        console.error('[AlertScan] Fatal error:', err.message);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}

export const POST = verifySignatureAppRouter(handler);
