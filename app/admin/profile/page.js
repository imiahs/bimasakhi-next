'use client';

import React from 'react';

export default function AdminProfile() {
    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-white border-b border-white/[0.06] pb-4">Administrator Profile</h1>
            
            <div className="admin-panel rounded-2xl p-6 flex items-start gap-8">
                <div className="bg-indigo-600 text-white w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold shadow-md">
                    A
                </div>
                
                <div className="space-y-4 flex-1">
                    <div>
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Account Holder</h2>
                        <p className="text-2xl font-bold text-white">Master Administrator</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/[0.06]">
                        <div>
                            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Contact Email</h2>
                            <p className="text-slate-300 font-medium">admin@bimasakhi.com</p>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Access Level</h2>
                            <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">Root Access</span>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Active Session</h2>
                            <p className="text-slate-300 font-medium">Currently Online</p>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Session Security</h2>
                            <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-bold">Encrypted Redis JSON</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
