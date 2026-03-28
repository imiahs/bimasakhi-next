'use client';
import React, { memo } from 'react';

function StatusBadge({ status, size = 'sm' }) {
    if (!status) return null;

    const normalized = String(status).toLowerCase();

    let colorClass = 'bg-zinc-50/85 text-zinc-700 border-zinc-200';
    let dotClass = 'bg-zinc-500';

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
        colorClass = 'bg-amber-50/90 text-amber-700 border-amber-200';
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
        colorClass = 'bg-emerald-50/90 text-emerald-700 border-emerald-200';
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
        colorClass = 'bg-rose-50/90 text-rose-700 border-rose-200';
        dotClass = 'bg-rose-500';
    }

    const sizeClass = size === 'md'
        ? 'px-3 py-1.5 text-[11px]'
        : 'px-2.5 py-1 text-[10px]';

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-[0.18em] shadow-sm ${colorClass} ${sizeClass}`}>
            <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotClass}`} />
            {status}
        </span>
    );
}

export default memo(StatusBadge);
