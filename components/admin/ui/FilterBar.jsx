'use client';
import React, { memo } from 'react';

/**
 * FilterBar — Reusable filter bar with search input and dropdown filters
 * 
 * @param {string}   searchValue      — Current search input value
 * @param {Function} onSearchChange   — (value) => void
 * @param {string}   searchPlaceholder — Placeholder for search input
 * @param {Array}    filters          — [{ key, label, value, options: [{ value, label }], onChange: (value) => void }]
 * @param {React.ReactNode} actions   — Optional right-side action buttons
 */
function FilterBar({ 
    searchValue = '', 
    onSearchChange, 
    searchPlaceholder = 'Search...', 
    filters = [],
    actions
}) {
    return (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            {/* Search Input */}
            {onSearchChange && (
                <div className="flex-1 relative min-w-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">
                        🔎
                    </span>
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-colors text-slate-200 placeholder:text-slate-500"
                    />
                </div>
            )}
            
            {/* Dropdown Filters */}
            {filters.map((filter) => (
                <select 
                    key={filter.key}
                    className="bg-white/[0.04] border border-white/[0.08] text-slate-200 text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-colors min-w-[140px]"
                    value={filter.value} 
                    onChange={(e) => filter.onChange(e.target.value)}
                    aria-label={filter.label}
                >
                    {filter.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            ))}

            {/* Optional Actions */}
            {actions && (
                <div className="flex items-center gap-2 sm:ml-auto flex-shrink-0">
                    {actions}
                </div>
            )}
        </div>
    );
}

export default memo(FilterBar);
