'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ApplyContent() {
    const searchParams = useSearchParams();
    const refCode = searchParams.get('ref') || '';

    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        ref_code: refCode
    });

    const [status, setStatus] = useState({ loading: false, success: false, error: '' });

    useEffect(() => {
        if (refCode) {
            setFormData(prev => ({ ...prev, ref_code: refCode }));
        }
    }, [refCode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ loading: true, success: false, error: '' });

        try {
            const res = await fetch('/api/agent/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (res.ok) {
                setStatus({ loading: false, success: true, error: '' });
                setFormData({ name: '', mobile: '', ref_code: refCode });
            } else {
                throw new Error(data.error || 'Failed to submit application');
            }
        } catch (error) {
            setStatus({ loading: false, success: false, error: error.message });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight text-center">Join Team Utkarshan</h2>
                    <p className="mt-2 text-sm text-slate-600 font-medium tracking-wide">
                        Start your journey as an independent LIC Agent.
                    </p>
                </div>

                {status.success ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                        <h3 className="text-lg font-medium text-green-800">Application Submitted!</h3>
                        <p className="text-sm text-green-600 mt-2">
                            A development officer will review your profile and contact you shortly to begin the exam preparation stage.
                        </p>
                    </div>
                ) : (
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="name" className="block text-sm font-semibold text-slate-700">Full Name</label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="mt-1 appearance-none relative block w-full px-3 py-2.5 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Rahul Sharma"
                            />
                        </div>
                        <div>
                            <label htmlFor="mobile" className="block text-sm font-semibold text-slate-700">Mobile Number</label>
                            <input
                                id="mobile"
                                name="mobile"
                                type="tel"
                                required
                                value={formData.mobile}
                                onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                                className="mt-1 appearance-none relative block w-full px-3 py-2.5 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="9876543210"
                            />
                        </div>

                        {refCode && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700">Referred By (Code)</label>
                                <input
                                    type="text"
                                    disabled
                                    value={refCode}
                                    className="mt-1 bg-slate-100 appearance-none relative block w-full px-3 py-2.5 border border-slate-300 text-slate-500 rounded-lg sm:text-sm cursor-not-allowed"
                                />
                            </div>
                        )}

                        {status.error && (
                            <div className="text-sm text-red-600 font-medium">
                                {status.error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={status.loading}
                            className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                            {status.loading ? 'Submitting...' : 'Apply Now'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
