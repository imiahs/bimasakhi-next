'use client';
import React, { memo } from 'react';

function MetricCard({ title, value, subtitle, trend, trendLabel, icon, statusColor }) {
    const isUp = trend === 'up';

    const accentMap = {
        success: {
            ring: 'before:bg-emerald-500',
            glow: 'shadow-[0_0_24px_rgba(16,185,129,0.08)]',
            icon: 'bg-emerald-500/10 text-emerald-400'
        },
        warning: {
            ring: 'before:bg-amber-500',
            glow: 'shadow-[0_0_24px_rgba(245,158,11,0.08)]',
            icon: 'bg-amber-500/10 text-amber-400'
        },
        error: {
            ring: 'before:bg-rose-500',
            glow: 'shadow-[0_0_24px_rgba(244,63,94,0.08)]',
            icon: 'bg-rose-500/10 text-rose-400'
        }
    };

    const accentClass = accentMap[statusColor] || {
        ring: 'before:bg-slate-500',
        glow: '',
        icon: 'bg-white/[0.06] text-slate-400'
    };

    return (
        <div className={`admin-panel mc-card-hover group relative flex flex-col overflow-hidden rounded-2xl p-5 ${accentClass.glow} before:absolute before:inset-x-5 before:top-0 before:h-[2px] before:rounded-full ${accentClass.ring}`}>
            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <p className="admin-kicker">{title}</p>
                    <p className="mt-1.5 text-xs text-slate-500">{subtitle || 'Live signal'}</p>
                </div>
                {icon && (
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-semibold ${accentClass.icon}`}>
                        {icon}
                    </div>
                )}
            </div>

            <div className="flex items-end gap-3">
                <h3 className="text-[1.75rem] font-bold tracking-[-0.04em] text-white">{value ?? '--'}</h3>
                {trend && (
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isUp
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                            : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                    }`}>
                        {isUp ? '↑' : '↓'} {trendLabel}
                    </span>
                )}
            </div>
        </div>
    );
}

export default memo(MetricCard);
