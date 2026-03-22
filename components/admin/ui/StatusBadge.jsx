'use client';
import React, { memo } from 'react';

/**
 * StatusBadge — Small pill UI mapped to status value
 * 
 * Statuses detected:
 *   success  → green  (completed, published, operational, success, active, converted, hot)
 *   warning  → yellow (pending, draft, degraded, processing, training, recruited)
 *   error    → red    (failed, downtime, error, inactive, lapsed)
 *   default  → gray
 * 
 * @param {string}   status — The status text to display
 * @param {'sm'|'md'} size  — Badge size variant (default: 'sm')
 */
function StatusBadge({ status, size = 'sm' }) {
    if (!status) return null;
    
    const s = String(status).toLowerCase();
    
    let colorClass = 'bg-zinc-50 text-zinc-600 border-zinc-200';
    let dotClass = 'bg-zinc-400';

    if (
        s.includes('pending') || s.includes('draft') || s.includes('degraded') ||
        s.includes('processing') || s.includes('training') || s.includes('recruited') ||
        s.includes('waiting')
    ) {
        colorClass = 'bg-yellow-50 text-yellow-700 border-yellow-200';
        dotClass = 'bg-yellow-500';
    } else if (
        s.includes('completed') || s.includes('published') || s.includes('operational') ||
        s.includes('success') || s.includes('active') || s.includes('converted') ||
        s.includes('hot') || s.includes('online')
    ) {
        colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        dotClass = 'bg-emerald-500';
    } else if (
        s.includes('failed') || s.includes('downtime') || s.includes('error') ||
        s.includes('inactive') || s.includes('lapsed') || s.includes('rejected')
    ) {
        colorClass = 'bg-red-50 text-red-700 border-red-200';
        dotClass = 'bg-red-500';
    }

    const sizeClass = size === 'md'
        ? 'px-2.5 py-1 text-xs'
        : 'px-2 py-0.5 text-[11px]';

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-md uppercase tracking-wider font-semibold border ${colorClass} ${sizeClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
            {status}
        </span>
    );
}

export default memo(StatusBadge);
