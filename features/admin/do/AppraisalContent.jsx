'use client';

import React from 'react';

export default function AppraisalContent() {
    // In production, this reads deeply aggregated stats bridging networkMetricsWorker cache
    // and overall DO targets over the agency year.
    return (
        <div className="max-w-7xl mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900">DO Appraisal & Growth Dashboard</h1>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 font-semibold rounded-lg shadow-sm transition">
                    Download Annual Report
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-indigo-800 to-indigo-900 p-6 rounded-xl shadow-lg text-white">
                    <h4 className="text-indigo-200 text-sm font-bold uppercase tracking-wider mb-1">FY Production (Net)</h4>
                    <p className="text-4xl font-extrabold text-white">₹85,45,000</p>
                    <p className="mt-4 text-sm font-medium text-indigo-300">Target: ₹1,00,00,000</p>
                    <div className="w-full bg-indigo-950 rounded-full h-2 mt-2">
                        <div className="bg-green-400 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h4 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Cost / Expense Ratio</h4>
                    <p className="text-4xl font-extrabold text-slate-800">14.2%</p>
                    <p className="mt-4 text-sm font-medium text-slate-500">Goal: Keep below 15%</p>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h4 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Avg Network Persistency</h4>
                    <p className="text-4xl font-extrabold text-slate-800">92.5%</p>
                    <p className="mt-4 text-sm font-medium text-slate-500">Above LIC Minimum (85%)</p>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-4 mb-4">Official Circulars</h3>
                <div className="border border-dashed border-slate-300 rounded-lg p-12 text-center bg-slate-50">
                    <p className="text-slate-500 font-medium">Drag & Drop new LIC circular PDFs here to distribute to the network motivation board.</p>
                </div>
            </div>
        </div>
    );
}
