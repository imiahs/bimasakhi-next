'use client';
import { useState, useEffect, useCallback } from 'react';

const CRITICALITY_COLORS = {
    critical: '#ef4444',
    important: '#f59e0b',
    nice_to_have: '#6b7280',
};

const HEALTH_COLORS = {
    healthy: '#22c55e',
    degraded: '#f59e0b',
    down: '#ef4444',
    unknown: '#6b7280',
};

const CIRCUIT_COLORS = {
    closed: '#22c55e',
    open: '#ef4444',
    half_open: '#f59e0b',
};

export default function VendorHealthPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(null);

    const fetchHealth = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/vendor-health', { credentials: 'include' });
            const json = await res.json();
            setData(json);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Health fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [fetchHealth]);

    if (loading) {
        return <div style={{ padding: 32, color: '#9ca3af' }}>Loading vendor health...</div>;
    }

    if (!data) {
        return <div style={{ padding: 32, color: '#ef4444' }}>Failed to load health data</div>;
    }

    const { overall, vendors, sla_summary, dlq_pending, unacked_alerts } = data;

    return (
        <div style={{ padding: 24, maxWidth: 1200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>
                    Vendor Health Dashboard
                </h1>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {lastRefresh && (
                        <span style={{ fontSize: 12, color: '#6b7280' }}>
                            Last refresh: {lastRefresh.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        onClick={fetchHealth}
                        style={{ padding: '6px 12px', background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Overall Status Banner */}
            <div style={{
                padding: 16,
                borderRadius: 8,
                marginBottom: 24,
                background: overall.health === 'healthy' ? '#052e16' : overall.health === 'critical' ? '#450a0a' : '#451a03',
                border: `1px solid ${HEALTH_COLORS[overall.health] || '#6b7280'}44`,
            }}>
                <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>SYSTEM HEALTH</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: HEALTH_COLORS[overall.health], textTransform: 'uppercase' }}>
                            {overall.health}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>MODE</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>{overall.system_mode}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>VENDORS</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>{overall.vendor_count}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>CIRCUITS OPEN</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: overall.circuits_open > 0 ? '#ef4444' : '#22c55e' }}>
                            {overall.circuits_open}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>DLQ PENDING</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: dlq_pending > 0 ? '#f59e0b' : '#22c55e' }}>
                            {dlq_pending}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>UNACKED ALERTS</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: unacked_alerts > 0 ? '#f59e0b' : '#22c55e' }}>
                            {unacked_alerts}
                        </div>
                    </div>
                </div>
            </div>

            {/* Vendor Cards */}
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#94a3b8', marginBottom: 12 }}>Vendor Contracts</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350, 1fr))', gap: 16, marginBottom: 32 }}>
                {vendors.map((v) => (
                    <div key={v.vendor} style={{
                        background: '#1e293b',
                        borderRadius: 8,
                        padding: 16,
                        border: `1px solid ${HEALTH_COLORS[v.health_status] || '#334155'}44`,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', textTransform: 'uppercase' }}>
                                    {v.vendor}
                                </div>
                                <div style={{ fontSize: 12, color: '#9ca3af' }}>{v.purpose}</div>
                            </div>
                            <span style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                color: CRITICALITY_COLORS[v.criticality],
                                background: `${CRITICALITY_COLORS[v.criticality]}22`,
                                textTransform: 'uppercase',
                            }}>
                                {v.criticality}
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                            <div>
                                <span style={{ color: '#6b7280' }}>Health: </span>
                                <span style={{ color: HEALTH_COLORS[v.health_status], fontWeight: 600 }}>
                                    {v.health_status || 'unknown'}
                                </span>
                            </div>
                            <div>
                                <span style={{ color: '#6b7280' }}>Circuit: </span>
                                <span style={{ color: CIRCUIT_COLORS[v.live_circuit_state] || '#6b7280', fontWeight: 600 }}>
                                    {v.live_circuit_state || 'closed'}
                                </span>
                            </div>
                            <div>
                                <span style={{ color: '#6b7280' }}>Retries: </span>
                                <span style={{ color: '#e2e8f0' }}>{v.retry_max_attempts}x</span>
                            </div>
                            <div>
                                <span style={{ color: '#6b7280' }}>Backoff: </span>
                                <span style={{ color: '#e2e8f0' }}>{v.retry_base_delay_ms}ms x{v.retry_backoff_multiplier}</span>
                            </div>
                            <div>
                                <span style={{ color: '#6b7280' }}>CB Threshold: </span>
                                <span style={{ color: '#e2e8f0' }}>{v.cb_failure_threshold} fails / {v.cb_window_minutes}min</span>
                            </div>
                            <div>
                                <span style={{ color: '#6b7280' }}>CB Reset: </span>
                                <span style={{ color: '#e2e8f0' }}>{v.cb_reset_timeout_seconds}s</span>
                            </div>
                            <div>
                                <span style={{ color: '#6b7280' }}>SLA Warn: </span>
                                <span style={{ color: '#e2e8f0' }}>{v.sla_response_warning_ms}ms</span>
                            </div>
                            <div>
                                <span style={{ color: '#6b7280' }}>SLA Crit: </span>
                                <span style={{ color: '#e2e8f0' }}>{v.sla_response_critical_ms}ms</span>
                            </div>
                        </div>

                        {v.live_failure_count > 0 && (
                            <div style={{ marginTop: 8, padding: '4px 8px', background: '#451a0322', borderRadius: 4, fontSize: 12, color: '#f59e0b' }}>
                                {v.live_failure_count} recent failures in window
                            </div>
                        )}

                        {v.last_health_check && (
                            <div style={{ marginTop: 8, fontSize: 11, color: '#6b7280' }}>
                                Last check: {new Date(v.last_health_check).toLocaleString()}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* SLA Summary */}
            {Object.keys(sla_summary).length > 0 && (
                <>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#94a3b8', marginBottom: 12 }}>SLA Summary (Last Hour)</h2>
                    <div style={{ background: '#1e293b', borderRadius: 8, overflow: 'hidden', marginBottom: 32 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: '#0f172a' }}>
                                    <th style={{ padding: '10px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>Service</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'right', color: '#94a3b8', fontWeight: 600 }}>Requests</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'right', color: '#94a3b8', fontWeight: 600 }}>Avg Latency</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'right', color: '#94a3b8', fontWeight: 600 }}>Warnings</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'right', color: '#94a3b8', fontWeight: 600 }}>Critical</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(sla_summary).map(([service, s]) => (
                                    <tr key={service} style={{ borderTop: '1px solid #334155' }}>
                                        <td style={{ padding: '10px 16px', color: '#e2e8f0', fontWeight: 600, textTransform: 'uppercase' }}>{service}</td>
                                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#9ca3af' }}>{s.count}</td>
                                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#e2e8f0' }}>{s.avg_ms}ms</td>
                                        <td style={{ padding: '10px 16px', textAlign: 'right', color: s.warnings > 0 ? '#f59e0b' : '#6b7280' }}>{s.warnings}</td>
                                        <td style={{ padding: '10px 16px', textAlign: 'right', color: s.criticals > 0 ? '#ef4444' : '#6b7280' }}>{s.criticals}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Bible Reference */}
            <div style={{ padding: 12, background: '#0f172a', borderRadius: 8, fontSize: 12, color: '#6b7280' }}>
                Bible: Section 39 (External System Governance) | Rules 20-24 | Phase 21 |
                Auto-refresh: 30s | Circuit breaker: per-vendor | SLA: tracked per call
            </div>
        </div>
    );
}
