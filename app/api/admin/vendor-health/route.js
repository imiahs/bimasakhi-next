/**
 * GET /api/admin/vendor-health — Vendor health dashboard data
 * 
 * Bible Reference: Section 39
 * Returns: all vendor contracts with circuit state, SLA summary, DLQ count
 */
import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { getAllVendorStates, getSlaSummary } from '@/lib/vendorResilience';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getSystemMode } from '@/lib/system/systemModes';

async function handler() {
    const supabase = getServiceSupabase();

    // Parallel fetches
    const [vendors, slaSummary, systemMode, dlqResult, alertsResult] = await Promise.all([
        getAllVendorStates(),
        getSlaSummary(),
        getSystemMode(),
        supabase.from('job_dead_letters').select('*', { count: 'exact', head: true }),
        supabase.from('alert_deliveries')
            .select('*', { count: 'exact', head: true })
            .eq('acknowledged', false),
    ]);

    // Compute overall health
    const criticalVendors = vendors.filter(v => v.criticality === 'critical');
    const anyCircuitOpen = vendors.some(v => v.live_circuit_state === 'open');
    const anyDown = vendors.some(v => v.health_status === 'down');

    let overallHealth = 'healthy';
    if (anyDown) overallHealth = 'critical';
    else if (anyCircuitOpen) overallHealth = 'degraded';
    else if (systemMode !== 'normal') overallHealth = 'degraded';

    return NextResponse.json({
        overall: {
            health: overallHealth,
            system_mode: systemMode,
            vendor_count: vendors.length,
            critical_count: criticalVendors.length,
            circuits_open: vendors.filter(v => v.live_circuit_state === 'open').length,
        },
        vendors,
        sla_summary: slaSummary,
        dlq_pending: dlqResult.count || 0,
        unacked_alerts: alertsResult.count || 0,
        timestamp: new Date().toISOString(),
    });
}

export const GET = withAdminAuth(handler, ['super_admin']);
