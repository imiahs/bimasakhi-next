'use client';
import React, { memo } from 'react';

function MetricCard({ title, value, subtitle, trend, trendLabel, icon, statusColor }) {
    const isUp = trend === 'up';

    const accentMap = {
        success: {
            ring: 'before:bg-emerald-500/80',
            glow: 'shadow-[0_18px_34px_rgba(5,150,105,0.12)]',
            icon: 'bg-emerald-500/10 text-emerald-700'
        },
        warning: {
            ring: 'before:bg-amber-500/80',
            glow: 'shadow-[0_18px_34px_rgba(217,119,6,0.12)]',
            icon: 'bg-amber-500/10 text-amber-700'
        },
        error: {
            ring: 'before:bg-rose-500/80',
            glow: 'shadow-[0_18px_34px_rgba(225,29,72,0.12)]',
            icon: 'bg-rose-500/10 text-rose-700'
        }
    };

    const accentClass = accentMap[statusColor] || {
        ring: 'before:bg-zinc-400/60',
        glow: 'shadow-[0_18px_34px_rgba(39,39,42,0.08)]',
        icon: 'bg-zinc-900/5 text-zinc-700'
    };

    return (
        <div className={`admin-panel group relative flex flex-col overflow-hidden rounded-[1.5rem] p-5 transition duration-200 hover:-translate-y-0.5 ${accentClass.glow} before:absolute before:inset-x-5 before:top-0 before:h-1 before:rounded-full ${accentClass.ring}`}>
            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <p className="admin-kicker">{title}</p>
                    <p className="mt-2 text-[13px] font-medium leading-tight text-zinc-600">{subtitle || 'Live business signal'}</p>
                </div>
                {icon && (
                    <div className={`flex h-10 w-10 items-center justify-center rounded-[1rem] text-[11px] font-semibold shadow-sm ${accentClass.icon}`}>
                        {icon}
                    </div>
                )}
            </div>

            <div className="flex items-end gap-3">
                <h3 className="text-[2rem] font-semibold tracking-[-0.06em] text-zinc-950">{value ?? '--'}</h3>
                {trend && (
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] whitespace-nowrap ${
                        isUp
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-rose-200 bg-rose-50 text-rose-700'
                    }`}>
                        {isUp ? 'UP' : 'DOWN'} {trendLabel}
                    </span>
                )}
            </div>

            {!subtitle && (
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                    Real-time operator data
                </p>
            )}
        </div>
    );
}

export default memo(MetricCard);
