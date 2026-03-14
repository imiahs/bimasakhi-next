import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export const maxDuration = 300; 

export async function POST(request) {
    const startTime = Date.now();
    const upstashMessageId = request.headers.get('upstash-message-id') || `manual-${Date.now()}`;
    const upstashRetryCount = request.headers.get('upstash-retried') || '0';
    
    const supabase = getServiceSupabase();
    let successStatus = false;
    let errorMessage = null;

    try {
        let allAgentsFetched = [];
        let agentPage = 0;
        const PAGE_SIZE = 1000;
        while (true) {
            const { data, error } = await supabase
                .from('agents')
                .select('agent_id, parent_agent_id, last_business_date')
                .range(agentPage * PAGE_SIZE, (agentPage + 1) * PAGE_SIZE - 1);

            if (error) throw error;
            if (!data || data.length === 0) break;

            allAgentsFetched.push(...data);
            if (data.length < PAGE_SIZE) break;
            agentPage++;
        }
        const agents = allAgentsFetched;
        if (!agents.length) {
             successStatus = true;
             throw new Error("No agents found");
        }

        const childMap = new Map();
        agents.forEach(a => {
            if (a.parent_agent_id) {
                const children = childMap.get(a.parent_agent_id) || [];
                children.push(a.agent_id);
                childMap.set(a.parent_agent_id, children);
            }
        });

        let allPolicies = [];
        let policyPage = 0;
        while (true) {
            const { data, error } = await supabase
                .from('policies')
                .select('agent_id, policy_status')
                .range(policyPage * PAGE_SIZE, (policyPage + 1) * PAGE_SIZE - 1);

            if (error) throw error;
            if (!data || data.length === 0) break;

            allPolicies.push(...data);
            if (data.length < PAGE_SIZE) break;
            policyPage++;
        }

        const policyStats = new Map();
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
            let teamSize = 0;
            const visited = new Set();
            const queue = [agent.agent_id];
            while (queue.length > 0) {
                const current = queue.shift();
                if (visited.has(current)) continue;
                visited.add(current);
                const children = childMap.get(current) || [];
                teamSize += children.length;
                queue.push(...children);
            }

            const stats = policyStats.get(agent.agent_id) || { total: 0, lapsed: 0, active: 0 };
            const totalPolicies = stats.total;
            const lapsedPolicies = stats.lapsed;
            const renewedPolicies = stats.active;
            const persistencyRatio = totalPolicies > 0 ? (renewedPolicies / totalPolicies) * 100 : 0;

            persistencyBatch.push({ agent_id: agent.agent_id, total_policies: totalPolicies, renewed_policies: renewedPolicies, lapsed_policies: lapsedPolicies, renewal_ratio: persistencyRatio });

            if (totalPolicies === 0) {
                notificationBatch.push({ agent_id: agent.agent_id, type: 'coaching_alert', message: 'Agent has recorded 0 policies. Consider scheduling a coaching session.' });
            } else if (persistencyRatio < 50) {
                notificationBatch.push({ agent_id: agent.agent_id, type: 'coaching_alert', message: `Agent persistency is extremely low (${persistencyRatio.toFixed(1)}%). Urgent intervention required.` });
            }

            if (agent.last_business_date) {
                const daysInactive = (Date.now() - new Date(agent.last_business_date).getTime()) / (1000 * 60 * 60 * 24);
                if (daysInactive > 60) {
                    notificationBatch.push({ agent_id: agent.agent_id, type: 'coaching_alert', message: `Agent has been inactive for ${Math.round(daysInactive)} days.` });
                }
            }

            businessMetricsBatch.push({ agent_id: agent.agent_id, team_size: teamSize, total_policies: totalPolicies, renewal_ratio: persistencyRatio });
        }

        const CHUNK_SIZE = 500;
        for (let i = 0; i < persistencyBatch.length; i += CHUNK_SIZE) { await supabase.from('persistency_metrics').upsert(persistencyBatch.slice(i, i + CHUNK_SIZE)); }
        for (let i = 0; i < businessMetricsBatch.length; i += CHUNK_SIZE) { await supabase.from('agent_business_metrics').upsert(businessMetricsBatch.slice(i, i + CHUNK_SIZE)); }

        if (notificationBatch.length > 0) {
            const { data: existingNotifs } = await supabase.from('agent_notifications').select('agent_id, message').eq('is_read', false);
            const existingSet = new Set((existingNotifs || []).map(n => `${n.agent_id}:${n.message}`));
            const newNotifs = notificationBatch.filter(n => !existingSet.has(`${n.agent_id}:${n.message}`));

            for (let i = 0; i < newNotifs.length; i += CHUNK_SIZE) {
                await supabase.from('agent_notifications').insert(newNotifs.slice(i, i + CHUNK_SIZE));
            }
        }

        const today = new Date();
        const boundaries = [7, 15, 30]; 

        for (const days of boundaries) {
            const targetDate = new Date();
            targetDate.setDate(today.getDate() + days);
            const targetDateStr = targetDate.toISOString().split('T')[0];

            const { data: upcomingRenewals } = await supabase
                .from('renewals')
                .select(`renewal_id, renewal_due_date, policy_id, policies!inner(agent_id, customer_name)`)
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

        successStatus = true;
    } catch (e) {
        if (!successStatus) {
            errorMessage = e.message;
            console.error('[NetworkMetrics Worker]', e);
        }
    } finally {
        const executionTime = Date.now() - startTime;
        await supabase.from('worker_health').insert({
            worker_name: 'network-metrics',
            status: successStatus ? 'healthy' : 'error',
            last_run: new Date().toISOString(),
            message: successStatus ? `Topology scanned and notifications sent via Serverless hook.` : errorMessage,
            metrics: {
                job_id: upstashMessageId,
                execution_time_ms: executionTime,
                retry_count: parseInt(upstashRetryCount),
                success: successStatus
            }
        });
    }

    if (!successStatus) return NextResponse.json({ error: errorMessage }, { status: 500 });
    return NextResponse.json({ success: true });
}
