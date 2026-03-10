import { Worker } from 'bullmq';
import { getRedisConnection } from '../queue/redis.js';
import { supabase } from '../supabase.js';
import { systemLogger } from '../logger/systemLogger.js';
import { metricsBatcher } from '../telemetry/metricsBatcher.js';

import { logError } from '../monitoring/logError.js';

export const startNetworkMetricsWorker = () => {
    const conn = getRedisConnection();
    if (!conn) {
        systemLogger.logWarning('NetworkMetricsWorker', 'Redis not connected, skipping initialization.');
        return null;
    }

    const worker = new Worker('NetworkMetricsQueue', async (job) => {
        systemLogger.logInfo('NetworkMetricsWorker', `Starting network metrics computation ${job.id}`);
        const startTime = Date.now();

        try {
            await computeNetworkMetrics();

            const duration = Date.now() - startTime;
            systemLogger.logInfo('NetworkMetricsWorker', `Job ${job.id} completed in ${duration}ms`);
            metricsBatcher.recordJobProcessed('networkMetricsQueue', duration);

            return { success: true, processedAt: new Date().toISOString() };
        } catch (error) {
            logError('NetworkMetricsWorker', `Job ${job.id} failed`, error);
            metricsBatcher.recordJobFailed('networkMetricsQueue');
            throw error;
        }
    }, { connection: conn, concurrency: 1 });

    worker.on('failed', (job, err) => {
        metricsBatcher.recordJobFailed('networkMetricsQueue');
        systemLogger.logError('NetworkMetricsWorker', `Job ${job?.id} failed out-of-band: ${err.message}`);
    });

    console.log('[startWorkers] NetworkMetricsWorker initialized.');
    return worker;
};

async function computeNetworkMetrics() {
    // 1. Fetch all agents
    const { data: agents, error: fetchError } = await supabase
        .from('agents')
        .select('agent_id, parent_agent_id, last_business_date');

    if (fetchError || !agents) throw fetchError || new Error("No agents found");

    // Precompute a parent-child map for fast tree traversal in memory
    const childMap = new Map(); // parent_id -> array of child agent_ids
    agents.forEach(a => {
        if (a.parent_agent_id) {
            const children = childMap.get(a.parent_agent_id) || [];
            children.push(a.agent_id);
            childMap.set(a.parent_agent_id, children);
        }
    });

    // === GROUPED QUERY: Fetch ALL policies in one call, group in memory ===
    const { data: allPolicies } = await supabase
        .from('policies')
        .select('agent_id, policy_status');

    // Build per-agent policy stats in memory
    const policyStats = new Map(); // agent_id -> { total, lapsed, active }
    if (allPolicies) {
        for (const p of allPolicies) {
            if (!policyStats.has(p.agent_id)) {
                policyStats.set(p.agent_id, { total: 0, lapsed: 0, active: 0 });
            }
            const stats = policyStats.get(p.agent_id);
            stats.total++;
            if (p.policy_status === 'lapsed') stats.lapsed++;
            if (p.policy_status === 'active') stats.active++;
        }
    }

    const persistencyBatch = [];
    const businessMetricsBatch = [];
    const notificationBatch = [];

    for (const agent of agents) {
        // === BFS with CYCLE DETECTION ===
        let teamSize = 0;
        const visited = new Set();
        const queue = [agent.agent_id];
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current)) continue; // Prevent infinite loops
            visited.add(current);
            const children = childMap.get(current) || [];
            teamSize += children.length;
            queue.push(...children);
        }

        // Use pre-computed policy stats instead of per-agent queries
        const stats = policyStats.get(agent.agent_id) || { total: 0, lapsed: 0, active: 0 };
        const totalPolicies = stats.total;
        const lapsedPolicies = stats.lapsed;
        const renewedPolicies = stats.active;
        const persistencyRatio = totalPolicies > 0 ? (renewedPolicies / totalPolicies) * 100 : 0;

        // Batch persistency metrics
        persistencyBatch.push({
            agent_id: agent.agent_id,
            total_policies: totalPolicies,
            renewed_policies: renewedPolicies,
            lapsed_policies: lapsedPolicies,
            renewal_ratio: persistencyRatio
        });

        // Coaching alerts (batched)
        if (totalPolicies === 0) {
            notificationBatch.push({ agent_id: agent.agent_id, type: 'coaching_alert', message: 'Agent has recorded 0 policies. Consider scheduling a coaching session.' });
        } else if (persistencyRatio < 50) {
            notificationBatch.push({ agent_id: agent.agent_id, type: 'coaching_alert', message: `Agent persistency is extremely low (${persistencyRatio.toFixed(1)}%). Urgent intervention required.` });
        }

        // Detect inactivity (using pre-fetched last_business_date)
        if (agent.last_business_date) {
            const daysInactive = (Date.now() - new Date(agent.last_business_date).getTime()) / (1000 * 60 * 60 * 24);
            if (daysInactive > 60) {
                notificationBatch.push({ agent_id: agent.agent_id, type: 'coaching_alert', message: `Agent has been inactive for ${Math.round(daysInactive)} days.` });
            }
        }

        // Batch business metrics
        businessMetricsBatch.push({
            agent_id: agent.agent_id,
            team_size: teamSize,
            total_policies: totalPolicies,
            renewal_ratio: persistencyRatio
        });
    }

    // === BATCH UPSERTS (chunks of 500 to stay within Supabase limits) ===
    const CHUNK_SIZE = 500;
    for (let i = 0; i < persistencyBatch.length; i += CHUNK_SIZE) {
        await supabase.from('persistency_metrics').upsert(persistencyBatch.slice(i, i + CHUNK_SIZE));
    }
    for (let i = 0; i < businessMetricsBatch.length; i += CHUNK_SIZE) {
        await supabase.from('agent_business_metrics').upsert(businessMetricsBatch.slice(i, i + CHUNK_SIZE));
    }

    // Insert notifications (deduplicate by checking existing unread)
    if (notificationBatch.length > 0) {
        const { data: existingNotifs } = await supabase
            .from('agent_notifications')
            .select('agent_id, message')
            .eq('is_read', false);

        const existingSet = new Set((existingNotifs || []).map(n => `${n.agent_id}:${n.message}`));
        const newNotifs = notificationBatch.filter(n => !existingSet.has(`${n.agent_id}:${n.message}`));

        for (let i = 0; i < newNotifs.length; i += CHUNK_SIZE) {
            await supabase.from('agent_notifications').insert(newNotifs.slice(i, i + CHUNK_SIZE));
        }
    }

    // 4. Renewal Reminders Process
    const today = new Date();
    const boundaries = [7, 15, 30]; // Days

    for (const days of boundaries) {
        const targetDate = new Date();
        targetDate.setDate(today.getDate() + days);
        const targetDateStr = targetDate.toISOString().split('T')[0];

        const { data: upcomingRenewals } = await supabase
            .from('renewals')
            .select(`
                renewal_id, 
                renewal_due_date,
                policy_id,
                policies!inner(agent_id, customer_name)
            `)
            .eq('renewal_due_date', targetDateStr)
            .eq('status', 'pending');

        if (upcomingRenewals) {
            const renewalNotifs = upcomingRenewals.map(renewal => ({
                agent_id: renewal.policies.agent_id,
                type: 'renewal_reminder',
                message: `Renewal due in ${days} days for customer ${renewal.policies.customer_name} (Policy: ${renewal.policy_id}).`
            }));
            if (renewalNotifs.length > 0) {
                await supabase.from('agent_notifications').insert(renewalNotifs);
            }
        }
    }

    // 5. Update Competition Rankings (batch approach)
    const { data: activeComps } = await supabase
        .from('competitions')
        .select('id, criteria')
        .lte('duration_start', today.toISOString())
        .gte('duration_end', today.toISOString());

    if (activeComps) {
        for (const comp of activeComps) {
            const { data: participants } = await supabase
                .from('agent_competition_participation')
                .select('id, agent_id, achieved_value')
                .eq('competition_id', comp.id)
                .order('achieved_value', { ascending: false });

            if (participants) {
                const updates = participants.map((p, idx) => ({
                    id: p.id,
                    agent_id: p.agent_id,
                    competition_id: comp.id,
                    achieved_value: p.achieved_value,
                    rank: idx + 1
                }));
                if (updates.length > 0) {
                    await supabase.from('agent_competition_participation').upsert(updates);
                }
            }
        }
    }
}

async function insertNotification(agentId, type, message) {
    // Check if notification already exists to avoid spamming the same alert
    const { data: existing } = await supabase
        .from('agent_notifications')
        .select('id')
        .eq('agent_id', agentId)
        .eq('message', message)
        .eq('is_read', false)
        .single();

    if (!existing) {
        await supabase.from('agent_notifications').insert({
            agent_id: agentId,
            type: type,
            message: message
        });
    }
}
