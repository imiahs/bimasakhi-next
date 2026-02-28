'use client';

import { useEffect, useContext } from 'react';
import { UserContext } from '@/context/UserContext';

const DisclaimerContent = () => {
    const { markPageVisited } = useContext(UserContext);
    useEffect(() => { markPageVisited('disclaimer'); }, []);

    return (
        <div className="container py-8 max-w-3xl">
            <h1 className="text-3xl font-bold mb-6">Disclaimer</h1>

            <div className="prose">
                <p><strong>Not an Official LIC Website</strong></p>
                <div className="mb-6 space-y-4">
                    <p>Bima Sakhi is a women-focused career initiative introduced by Life Insurance Corporation of India (LIC) under its agency recruitment framework for female advisors.</p>
                    <p>bimasakhi.com is an independent informational and application facilitation platform operated by IMIAH Services to help interested candidates understand the opportunity and submit their details for further contact.</p>
                    <p>This website is NOT the official website of Life Insurance Corporation of India, and IMIAH Services is not claiming to represent LIC of India in any official capacity.</p>
                    <p>All scheme-related information presented here is based on publicly available details for awareness purposes only.</p>
                </div>
                <p className="mb-4">For official notifications, rules, eligibility criteria, and updates regarding LIC schemes, users are advised to visit the official website: <a href="https://www.licindia.in" target="_blank" rel="noreferrer" className="text-pink-600 underline">https://www.licindia.in</a>.</p>
                <p className="mb-4 font-semibold text-gray-700 p-4 bg-gray-50 rounded">Note: Income figures mentioned are illustrative based on commission structures. Actual income depends entirely on individual performance and no fixed salary is guaranteed.</p>
                <p className="mb-4 text-sm text-gray-500">All trademarks and logos belong to their respective owners. Used here for informational purposes only.</p>
            </div>
        </div>
    );
};

export default DisclaimerContent;
