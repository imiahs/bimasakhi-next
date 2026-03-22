import React from 'react';

export default function MetricCard({ title, value, subtitle, trend, trendLabel, icon }) {
    const isUp = trend === 'up';
    const isDown = trend === 'down';

    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div className="text-slate-500 font-medium text-sm">{title}</div>
                {icon && <div className="text-slate-400 bg-slate-50 p-2 rounded-lg">{icon}</div>}
            </div>
            <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
                {trend && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isUp ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'
                    }`}>
                        {isUp ? '↑' : '↓'} {trendLabel}
                    </span>
                )}
            </div>
            {subtitle && <p className="text-xs text-slate-400 mt-2">{subtitle}</p>}
        </div>
    );
}
