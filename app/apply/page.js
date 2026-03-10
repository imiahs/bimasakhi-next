export const metadata = {
    title: 'Apply to Join Team Utkarshan - Life Insurance Corporation of India',
    description: 'Start your career as an LIC Agent. Become a certified professional today.',
};

import { Suspense } from 'react';
import ApplyContent from '@/features/agent/apply/ApplyContent';

export default function ApplyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex justify-center items-center"><p>Loading...</p></div>}>
            <ApplyContent />
        </Suspense>
    );
}
