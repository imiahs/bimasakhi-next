'use client';

import { useEffect, useContext, useState } from 'react';
import { UserContext } from '@/context/UserContext';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const EligibilityContent = () => {
    const { markPageVisited } = useContext(UserContext);
    const [canProceed, setCanProceed] = useState(false);
    const [checks, setChecks] = useState({
        age: false,
        education: false,
        delhi: false
    });

    useEffect(() => {
        markPageVisited('eligibility');
    }, []);

    useEffect(() => {
        setCanProceed(checks.age && checks.education && checks.delhi);
    }, [checks]);

    const handleCheck = (field) => {
        setChecks(prev => ({ ...prev, [field]: !prev[field] }));
    };

    return (
        <div className="page-eligibility container">
            <h1>Eligibility Check</h1>
            <p>Before applying, please confirm you meet the criteria:</p>

            <Card className="checklist">
                <div className="checkbox-group">
                    <input
                        type="checkbox"
                        id="age"
                        checked={checks.age}
                        onChange={() => handleCheck('age')}
                    />
                    <label htmlFor="age">I am a woman between 18-70 years old.</label>
                </div>

                <div className="checkbox-group">
                    <input
                        type="checkbox"
                        id="education"
                        checked={checks.education}
                        onChange={() => handleCheck('education')}
                    />
                    <label htmlFor="education">I have completed at least 10th standard education.</label>
                </div>

                <div className="checkbox-group">
                    <input
                        type="checkbox"
                        id="delhi"
                        checked={checks.delhi}
                        onChange={() => handleCheck('delhi')}
                    />
                    <label htmlFor="delhi">I live in Delhi NCR (Delhi, Noida, Gurugram, etc).</label>
                </div>
            </Card>

            <div className="who-should-not-join">
                <h3>Who should NOT join?</h3>
                <ul>
                    <li>Fixed salary seekers</li>
                    <li>Those wanting a desk job with no field work</li>
                </ul>
            </div>

            <div className="action-area">
                <Link href="/apply">
                    <Button variant="primary" disabled={!canProceed}>
                        {canProceed ? "Proceed to Apply" : "Confirm Above to Proceed"}
                    </Button>
                </Link>
            </div>
        </div>
    );
};

export default EligibilityContent;
