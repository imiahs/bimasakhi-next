import React from 'react';

export default function StatusBadge({ status }) {
    if (!status) return null;
    
    const s = String(status).toLowerCase();
    
    let colorClass = 'bg-white text-zinc-600 border-zinc-200';
    let dotClass = 'bg-zinc-400';

    if (s.includes('pending') || s.includes('draft') || s.includes('degraded') || s.includes('processing')) {
        colorClass = 'bg-white text-yellow-600 border-yellow-200';
        dotClass = 'bg-yellow-500';
    } else if (s.includes('completed') || s.includes('published') || s.includes('operational') || s.includes('success') || s.includes('converted') || s.includes('hot')) {
        colorClass = 'bg-white text-emerald-600 border-emerald-200';
        dotClass = 'bg-emerald-500';
    } else if (s.includes('failed') || s.includes('downtime') || s.includes('error')) {
        colorClass = 'bg-white text-red-600 border-red-200';
        dotClass = 'bg-red-500';
    }

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] uppercase tracking-wider font-semibold border ${colorClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></span>
            {status}
        </span>
    );
}
