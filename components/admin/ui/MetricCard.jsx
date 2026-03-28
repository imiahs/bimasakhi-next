'use client';
import React, { memo } from 'react';

/**
 * MetricCard — Production-grade metric display component
 * 
 * @param {string}   title       — Metric label
 * @param {*}        value       — Numeric or string value
 * @param {string}   subtitle    — Optional secondary text
 * @param {'up'|'down'|null} trend — Trend direction arrow
 * @param {string}   trendLabel  — Label next to trend arrow
 * @param {string}   icon        — Optional emoji/icon element
 * @param {'success'|'warning'|'error'|null} statusColor — Border accent
 */
function MetricCard({ title, value, subtitle, trend, trendLabel, icon, statusColor }) {
    const isUp = trend === 'up';

    // Border accent based on status
    const accentMap = {
        success: 'border-l-emerald-500',
        warning: 'border-l-yellow-500',
        error: 'border-l-red-500',
    };
    const accentClass = statusColor ? accentMap[statusColor] || '' : '';

    return (
        <div className={`flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md ${accentClass ? `border-l-[3px] ${accentClass}` : ''}`}>
            <div className="flex justify-between items-start mb-4">
                <p className="text-zinc-500 font-medium text-sm leading-tight">{title}</p>
                {icon && (
                    <div className="text-zinc-500 bg-zinc-100 p-2.5 rounded-xl text-base flex-shrink-0">
                        {icon}
                    </div>
                )}
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
                <h3 className="text-3xl font-semibold tracking-tight text-zinc-900">{value ?? '—'}</h3>
                {trend && (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${
                        isUp
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                            : 'text-red-700 bg-red-50 border-red-100'
                    }`}>
                        {isUp ? '↑' : '↓'} {trendLabel}
                    </span>
                )}
            </div>
            {subtitle && <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{subtitle}</p>}
        </div>
    );
}

export default memo(MetricCard);
