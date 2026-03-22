import React from 'react';

export default function MetricCard({ title, value, subtitle, trend, trendLabel, icon }) {
    const isUp = trend === 'up';
    const isDown = trend === 'down';

    return (
        <div className="bg-white rounded-xl p-5 border border-zinc-200 flex flex-col hover:border-zinc-300 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className="text-zinc-500 font-medium text-sm">{title}</div>
                {icon && <div className="text-zinc-400 bg-zinc-50 p-2 rounded-lg">{icon}</div>}
            </div>
            <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-semibold tracking-tight text-zinc-900">{value}</h3>
                {trend && (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                        isUp ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-red-700 bg-red-50 border-red-100'
                    }`}>
                        {isUp ? '↑' : '↓'} {trendLabel}
                    </span>
                )}
            </div>
            {subtitle && <p className="text-xs text-zinc-400 mt-2">{subtitle}</p>}
        </div>
    );
}
