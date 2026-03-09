import { Worker } from 'bullmq';
import { getRedisConnection } from '../queue/redis.js';
import { supabase } from '../supabase.js';
import { systemLogger } from '../logger/systemLogger.js';
import { metricsBatcher } from '../telemetry/metricsBatcher.js';

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
            systemLogger.logError('NetworkMetricsWorker', `Job ${job.id} failed: ${error.message}`, error.stack);
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
        .select('agent_id, parent_agent_id');

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

    for (const agent of agents) {
        let teamSize = 0;

        // Simple BFS to calculate team size
        const queue = [agent.agent_id];
        while (queue.length > 0) {
            const current = queue.shift();
            const children = childMap.get(current) || [];
            teamSize += children.length;
            queue.push(...children);
        }

        // 2. Compute individual agent stats (policies, persistency)
        // Note: For 10k agents, doing this in a loop could hit limits. 
        // We'll use aggregate queries but for simplicity, we query individually mapped.
        // A better approach at scale is grouping in SQL. We'll do a safe fallback here.

        const { count: totalPolicies } = await supabase.from('policies').select('*', { count: 'exact', head: true }).eq('agent_id', agent.agent_id);
        const { count: lapsedPolicies } = await supabase.from('policies').select('*', { count: 'exact', head: true }).eq('agent_id', agent.agent_id).eq('policy_status', 'lapsed');
        const { count: activePolicies } = await supabase.from('policies').select('*', { count: 'exact', head: true }).eq('agent_id', agent.agent_id).eq('policy_status', 'active');

        const renewedPolicies = activePolicies || 0;
        const persistencyRatio = totalPolicies > 0 ? (renewedPolicies / totalPolicies) * 100 : 0;

        // Upsert Persistency Metrics
        await supabase.from('persistency_metrics').upsert({
            agent_id: agent.agent_id,
            total_policies: totalPolicies || 0,
            renewed_policies: renewedPolicies,
            lapsed_policies: lapsedPolicies || 0,
            renewal_ratio: persistencyRatio
        });

        // 3. Admin Coaching Insights - Detect Inactive / Zero policies
        if (totalPolicies === 0) {
            await insertNotification(agent.agent_id, 'coaching_alert', 'Agent has recorded 0 policies. Consider scheduling a coaching session.');
        } else if (persistencyRatio < 50) {
            await insertNotification(agent.agent_id, 'coaching_alert', `Agent persistency is extremely low (${persistencyRatio.toFixed(1)}%). Urgent intervention required.`);
        }

        // Detect inactivity (No business in 60 days) - simplified check since we track last_business_date
        const { data: agentDetails } = await supabase.from('agents').select('last_business_date').eq('agent_id', agent.agent_id).single();
        if (agentDetails?.last_business_date) {
            const daysInactive = (Date.now() - new Date(agentDetails.last_business_date).getTime()) / (1000 * 60 * 60 * 24);
            if (daysInactive > 60) {
                await insertNotification(agent.agent_id, 'coaching_alert', `Agent has been inactive for ${Math.round(daysInactive)} days.`);
            }
        }

        // Upsert Business Metrics Defaults
        await supabase.from('agent_business_metrics').upsert({
            agent_id: agent.agent_id,
            team_size: teamSize,
            total_policies: totalPolicies || 0,
            renewal_ratio: persistencyRatio
        });
    }

    // 4. Renewal Reminders Process
    const today = new Date();
    const boundaries = [7, 15, 30]; // Days

    for (const days of boundaries) {
        const targetDate = new Date();
        targetDate.setDate(today.getDate() + days);
        const targetDateStr = targetDate.toISOString().split('T')[0];

        // Find renewals due exactly on targetDate
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
            for (const renewal of upcomingRenewals) {
                const agentId = renewal.policies.agent_id;
                const custName = renewal.policies.customer_name;
                await insertNotification(
                    agentId,
                    'renewal_reminder',
                    `Renewal due in ${days} days for customer ${custName} (Policy: ${renewal.policy_id}).`
                );
            }
        }
    }

    // 5. Update Competition Rankings
    const { data: activeComps } = await supabase
        .from('competitions')
        .select('id, criteria')
        .lte('duration_start', today.toISOString())
        .gte('duration_end', today.toISOString());

    if (activeComps) {
        for (const comp of activeComps) {
            // Re-rank participants based on achieved_value
            const { data: participants } = await supabase
                .from('agent_competition_participation')
                .select('id, agent_id, achieved_value')
                .eq('competition_id', comp.id)
                .order('achieved_value', { ascending: false });

            if (participants) {
                let rank = 1;
                for (const p of participants) {
                    await supabase
                        .from('agent_competition_participation')
                        .update({ rank: rank })
                        .eq('id', p.id);
                    rank++;
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
