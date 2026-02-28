'use client';

import { useEffect, useContext } from 'react';
import { UserContext } from '@/context/UserContext';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import IncomeBlock from '@/features/dynamic-home/components/dynamic/IncomeBlock';

const IncomeContent = () => {
    const { markPageVisited } = useContext(UserContext);

    useEffect(() => {
        markPageVisited('income');
    }, []);

    return (
        <div className="page-income container">
            <IncomeBlock />

            <div className="action-area">
                <Link href="/eligibility">
                    <Button variant="primary">Next: Check Eligibility</Button>
                </Link>
            </div>
        </div>
    );
};

export default IncomeContent;
