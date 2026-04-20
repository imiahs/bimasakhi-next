/**
 * QStash Cron Setup — Creates cron schedules for production jobs
 * Usage: node --env-file=.env.local scripts/setup_qstash_crons.mjs
 */

const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const BASE_URL = 'https://bimasakhi.com';

if (!QSTASH_TOKEN) {
    console.error('MISSING: QSTASH_TOKEN');
    process.exit(1);
}

const CRONS = [
    {
        name: 'event-retry',
        url: `${BASE_URL}/api/jobs/event-retry`,
        cron: '*/5 * * * *',
        description: 'Retry failed/pending events every 5 minutes',
    },
    {
        name: 'reconciliation',
        url: `${BASE_URL}/api/jobs/reconciliation`,
        cron: '*/30 * * * *',
        description: 'Data consistency check every 30 minutes',
    },
    {
        name: 'alert-scan',
        url: `${BASE_URL}/api/jobs/alert-scan`,
        cron: '*/5 * * * *',
        description: 'Alert and runbook evaluation every 5 minutes',
    },
    {
        name: 'scheduled-publish',
        url: `${BASE_URL}/api/jobs/scheduled-publish`,
        cron: '0 * * * *',
        description: 'Publish scheduled content drafts every hour',
    },
];

async function listSchedules() {
    const resp = await fetch('https://qstash.upstash.io/v2/schedules', {
        headers: { Authorization: `Bearer ${QSTASH_TOKEN}` },
    });
    if (!resp.ok) {
        console.error('Failed to list schedules:', resp.status, await resp.text());
        return [];
    }
    return resp.json();
}

async function deleteSchedule(scheduleId) {
    const resp = await fetch(`https://qstash.upstash.io/v2/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${QSTASH_TOKEN}` },
    });
    return resp.ok;
}

async function createSchedule(cron) {
    console.log(`\nCreating: ${cron.name} (${cron.cron}) → ${cron.url}`);
    const resp = await fetch(`https://qstash.upstash.io/v2/schedules/${cron.url}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${QSTASH_TOKEN}`,
            'Content-Type': 'application/json',
            'Upstash-Cron': cron.cron,
            'Upstash-Retries': '3',
        },
        body: JSON.stringify({ source: 'setup_script' }),
    });

    if (resp.ok) {
        const data = await resp.json();
        console.log(`  ✓ Created: ${data.scheduleId}`);
        return data;
    } else {
        const err = await resp.text();
        console.error(`  ✗ Failed: ${err}`);
        return null;
    }
}

async function main() {
    console.log('═══ QSTASH CRON SETUP ═══\n');

    // Step 1: List existing schedules
    console.log('Step 1: Check existing schedules...');
    const existing = await listSchedules();
    console.log(`  Found ${existing.length} existing schedule(s)`);

    // Step 2: Remove duplicates for our endpoints
    for (const schedule of existing) {
        const dest = schedule.destination?.url || schedule.destination || '';
        const isOurs = CRONS.some(c => dest.includes(c.name));
        if (isOurs) {
            console.log(`  Removing old schedule: ${schedule.scheduleId} → ${dest}`);
            await deleteSchedule(schedule.scheduleId);
        }
    }

    // Step 3: Create new schedules
    console.log('\nStep 2: Creating schedules...');
    const results = [];
    for (const cron of CRONS) {
        const result = await createSchedule(cron);
        results.push({ ...cron, scheduleId: result?.scheduleId || 'FAILED' });
    }

    // Step 4: Verify
    console.log('\n\n═══ VERIFICATION ═══');
    const final = await listSchedules();
    console.log(`Total schedules: ${final.length}`);
    for (const s of final) {
        const dest = s.destination?.url || s.destination || '';
        console.log(`  ${s.scheduleId} → ${dest} (${s.cron})`);
    }

    // Summary
    console.log('\n═══ SUMMARY ═══');
    for (const r of results) {
        console.log(`  ${r.scheduleId === 'FAILED' ? '✗' : '✓'} ${r.name}: ${r.scheduleId}`);
    }
}

main().catch(err => {
    console.error('FATAL:', err.message);
    process.exit(1);
});
