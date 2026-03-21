'use client';

import React from 'react';

export default function AdminProfile() {
    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-slate-800 border-b border-slate-200 pb-4">Administrator Profile</h1>
            
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex items-start gap-8">
                <div className="bg-indigo-600 text-white w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold shadow-md">
                    A
                </div>
                
                <div className="space-y-4 flex-1">
                    <div>
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Account Holder</h2>
                        <p className="text-2xl font-bold text-slate-800">Master Administrator</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Email</h2>
                            <p className="text-slate-700 font-medium">admin@bimasakhi.com</p>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Access Level</h2>
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Root Access</span>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active Session</h2>
                            <p className="text-slate-700 font-medium">Currently Online</p>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Session Security</h2>
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">Encrypted Redis JSON</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
