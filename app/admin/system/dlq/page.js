'use client';
import { useState, useEffect, useCallback } from 'react';

export default function DLQPage() {
    const [entries, setEntries] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState(null);
    const [statusFilter, setStatusFilter] = useState('pending');

    const fetchDLQ = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/dlq?limit=50&status=${encodeURIComponent(statusFilter)}`, { credentials: 'include' });
            const json = await res.json();
            if (json.success) {
                setEntries(json.data || []);
                setTotal(json.total || 0);
            }
        } catch (err) {
            console.error('DLQ fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { fetchDLQ(); }, [fetchDLQ]);

    const handleAction = async (id, action) => {
        setActing(id);
        try {
            const res = await fetch('/api/admin/dlq', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action }),
            });
            const json = await res.json();
            if (json.success) {
                await fetchDLQ();
            } else {
                alert(`Action failed: ${json.error}`);
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setActing(null);
        }
    };

    if (loading) {
        return <div style={{ padding: 32, color: '#9ca3af' }}>Loading dead letter queue...</div>;
    }

    return (
        <div style={{ padding: 24, maxWidth: 1200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>
                    Dead Letter Queue
                </h1>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        style={{ padding: '6px 12px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, fontSize: 13 }}
                    >
                        <option value="pending">Pending</option>
                        <option value="retried">Retried</option>
                        <option value="discarded">Discarded</option>
                        <option value="resolved">Resolved</option>
                        <option value="all">All</option>
                    </select>
                    <span style={{ fontSize: 14, color: total > 0 ? '#f59e0b' : '#22c55e', fontWeight: 600 }}>
                        {total} {statusFilter}
                    </span>
                    <button
                        onClick={fetchDLQ}
                        style={{ padding: '6px 12px', background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {entries.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: '#6b7280', background: '#1e293b', borderRadius: 8 }}>
                    No dead letters. All systems nominal.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {entries.map((entry) => (
                        <div key={entry.id} style={{
                            background: '#1e293b',
                            borderRadius: 8,
                            padding: 16,
                            border: '1px solid #334155',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <div>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
                                        {entry.job_class || entry.job_type || 'unknown'}
                                    </span>
                                    <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>
                                        #{entry.id}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {(entry.operator_status || 'pending') === 'pending' ? (
                                        <>
                                            <button
                                                onClick={() => handleAction(entry.id, 'reprocess')}
                                                disabled={acting === entry.id}
                                                style={{
                                                    padding: '4px 12px',
                                                    background: '#22c55e22',
                                                    color: '#22c55e',
                                                    border: '1px solid #22c55e44',
                                                    borderRadius: 4,
                                                    cursor: 'pointer',
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {acting === entry.id ? '...' : 'Reprocess'}
                                            </button>
                                            <button
                                                onClick={() => handleAction(entry.id, 'resolve')}
                                                disabled={acting === entry.id}
                                                style={{
                                                    padding: '4px 12px',
                                                    background: '#cbd5e122',
                                                    color: '#cbd5e1',
                                                    border: '1px solid #cbd5e144',
                                                    borderRadius: 4,
                                                    cursor: 'pointer',
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Resolve
                                            </button>
                                            <button
                                                onClick={() => handleAction(entry.id, 'discard')}
                                                disabled={acting === entry.id}
                                                style={{
                                                    padding: '4px 12px',
                                                    background: '#ef444422',
                                                    color: '#ef4444',
                                                    border: '1px solid #ef444444',
                                                    borderRadius: 4,
                                                    cursor: 'pointer',
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Discard
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleAction(entry.id, 'requeue')}
                                            disabled={acting === entry.id}
                                            style={{
                                                padding: '4px 12px',
                                                background: '#38bdf822',
                                                color: '#38bdf8',
                                                border: '1px solid #38bdf844',
                                                borderRadius: 4,
                                                cursor: 'pointer',
                                                fontSize: 12,
                                                fontWeight: 600,
                                            }}
                                        >
                                            {acting === entry.id ? '...' : 'Requeue'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ fontSize: 13, color: '#f87171', marginBottom: 8 }}>
                                {entry.failure_reason}
                            </div>

                            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280', flexWrap: 'wrap' }}>
                                <span>Attempts: {entry.retry_count || entry.attempt_count || 'N/A'}</span>
                                {entry.original_job_run_id && <span>Original Job: {entry.original_job_run_id}</span>}
                                <span>Dead at: {new Date(entry.created_at).toLocaleString()}</span>
                            </div>

                            {entry.payload && (
                                <details style={{ marginTop: 8 }}>
                                    <summary style={{ fontSize: 12, color: '#6b7280', cursor: 'pointer' }}>Payload</summary>
                                    <pre style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, background: '#0f172a', padding: 8, borderRadius: 4, overflow: 'auto', maxHeight: 200 }}>
                                        {JSON.stringify(entry.payload, null, 2)}
                                    </pre>
                                </details>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div style={{ marginTop: 24, padding: 12, background: '#0f172a', borderRadius: 8, fontSize: 12, color: '#6b7280' }}>
                Bible: Section 39, Step 2 | DLQ Consumer | SHOS preserves history for retry, discard, resolve, and requeue actions.
            </div>
        </div>
    );
}
