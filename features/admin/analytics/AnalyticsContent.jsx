'use client';

import React from 'react';

const AnalyticsContent = () => {
    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="admin-page-header">
                <h1>Funnel & Lead Analytics</h1>
                <p>Granular traffic source analysis, drop-off rates, and CRM conversions.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200">
                <h3 className="text-lg font-semibold mb-4 text-slate-800">Traffic Acquisition Channels</h3>
                <div className="h-64 flex items-center justify-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg">
                    <span className="text-slate-500 font-medium">[Bar Chart Placeholder: Google vs Meta vs Direct]</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">Application Drop-off</h3>
                    <div className="h-48 flex items-center justify-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg">
                        <span className="text-slate-500 font-medium">[Funnel Chart: Apply Step 1 to Submit]</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">Device Usage</h3>
                    <div className="h-48 flex items-center justify-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg">
                        <span className="text-slate-500 font-medium">[Pie Chart: Mobile vs Desktop]</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsContent;
