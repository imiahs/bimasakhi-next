'use client';
import React, { memo } from 'react';

function StatusBadge({ status, size = 'sm' }) {
    if (!status) return null;

    const normalized = String(status).toLowerCase();

    let colorClass = 'bg-white/[0.06] text-slate-400 border-white/[0.08]';
    let dotClass = 'bg-slate-500';

    if (
        normalized.includes('pending') ||
        normalized.includes('draft') ||
        normalized.includes('degraded') ||
        normalized.includes('processing') ||
        normalized.includes('training') ||
        normalized.includes('recruited') ||
        normalized.includes('waiting') ||
        normalized.includes('paused')
    ) {
        colorClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        dotClass = 'bg-amber-500';
    } else if (
        normalized.includes('completed') ||
        normalized.includes('published') ||
        normalized.includes('operational') ||
        normalized.includes('success') ||
        normalized.includes('active') ||
        normalized.includes('converted') ||
        normalized.includes('hot') ||
        normalized.includes('online') ||
        normalized === 'on'
    ) {
        colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        dotClass = 'bg-emerald-500';
    } else if (
        normalized.includes('failed') ||
        normalized.includes('downtime') ||
        normalized.includes('error') ||
        normalized.includes('inactive') ||
        normalized.includes('lapsed') ||
        normalized.includes('rejected') ||
        normalized === 'off'
    ) {
        colorClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        dotClass = 'bg-rose-500';
    }

    const sizeClass = size === 'md'
        ? 'px-3 py-1.5 text-[11px]'
        : 'px-2.5 py-1 text-[10px]';

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wider ${colorClass} ${sizeClass}`}>
            <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotClass}`} />
            {status}
        </span>
    );
}

export default memo(StatusBadge);
