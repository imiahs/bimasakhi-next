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
import { getSystemHealthSnapshot, normalizeHealthForUi } from '@/lib/system/systemHealth';

async function handler() {
    const supabase = getServiceSupabase();

    // Parallel fetches
    const [vendors, slaSummary, systemHealth, dlqResult, alertsResult] = await Promise.all([
        getAllVendorStates(),
        getSlaSummary(),
        getSystemHealthSnapshot(),
        supabase.from('job_dead_letters').select('*', { count: 'exact', head: true }),
        supabase.from('alert_deliveries')
            .select('*', { count: 'exact', head: true })
            .eq('acknowledged', false),
    ]);

    const criticalVendors = vendors.filter(v => v.criticality === 'critical');

    return NextResponse.json({
        overall: {
            health: normalizeHealthForUi(systemHealth.overall_health),
            system_mode: systemHealth.system_mode.mode,
            vendor_count: vendors.length,
            critical_count: criticalVendors.length,
            circuits_open: vendors.filter(v => v.live_circuit_state === 'open').length,
        },
        system_health: systemHealth,
        vendors,
        sla_summary: slaSummary,
        dlq_pending: dlqResult.count || 0,
        unacked_alerts: alertsResult.count || 0,
        timestamp: new Date().toISOString(),
    });
}

export const GET = withAdminAuth(handler, ['super_admin']);
