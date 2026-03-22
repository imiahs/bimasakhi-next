import React from 'react';

export default function StatusBadge({ status }) {
    if (!status) return null;
    
    const s = String(status).toLowerCase();
    
    let colorClass = 'bg-slate-100 text-slate-600 border-slate-200';
    let dotClass = 'bg-slate-400';

    if (s.includes('pending') || s.includes('draft') || s.includes('degraded') || s.includes('processing')) {
        colorClass = 'bg-yellow-50 text-yellow-700 border-yellow-200';
        dotClass = 'bg-yellow-500';
    } else if (s.includes('completed') || s.includes('published') || s.includes('operational') || s.includes('success') || s.includes('converted') || s.includes('hot')) {
        colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        dotClass = 'bg-emerald-500';
    } else if (s.includes('failed') || s.includes('downtime') || s.includes('error')) {
        colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
        dotClass = 'bg-rose-500';
    }

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></span>
            {status}
        </span>
    );
}
