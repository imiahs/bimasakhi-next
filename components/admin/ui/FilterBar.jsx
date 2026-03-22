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
        <div className="bg-white p-4 rounded-xl border border-zinc-200 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            {/* Search Input */}
            {onSearchChange && (
                <div className="flex-1 relative min-w-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">
                        🔎
                    </span>
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-zinc-50/50 border border-zinc-200 rounded-md text-sm focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition-colors text-zinc-800 placeholder:text-zinc-400"
                    />
                </div>
            )}
            
            {/* Dropdown Filters */}
            {filters.map((filter) => (
                <select 
                    key={filter.key}
                    className="bg-zinc-50/50 border border-zinc-200 text-zinc-800 text-sm rounded-md px-4 py-2 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition-colors min-w-[140px]"
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
