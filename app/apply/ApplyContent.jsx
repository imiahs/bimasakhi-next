'use client';

import { useContext } from 'react';
import ApplyForm from '@/features/leads/ApplyForm';
import { UserContext } from '@/context/UserContext';

const ApplyContent = () => {
    const { userState } = useContext(UserContext);

    const missingSteps = [];
    if (!userState.visitedPages.includes('income')) missingSteps.push('Income Reality');
    if (!userState.visitedPages.includes('eligibility')) missingSteps.push('Eligibility');

    return (
        <div className="page-apply container">
            <h1>Final Step: Application</h1>

            {userState.source === 'website' && missingSteps.length > 0 && (
                <div className="warning-banner">
                    <p>Warning: You have skipped important details ({missingSteps.join(', ')}).</p>
                    <p>Please make sure you understand this is a COMMISSION-ONLY role.</p>
                </div>
            )}

            <ApplyForm />
        </div>
    );
};

export default ApplyContent;
