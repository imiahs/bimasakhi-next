'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import '@/styles/Tools.css';

const CommissionCalculator = () => {
    const [policyPremium, setPolicyPremium] = useState(50000);
    const [policyType, setPolicyType] = useState('endowment');

    // Commission logic based on standard LIC rates
    let fycRate = 0;
    let renewalRate2to3 = 0.075; // 7.5% for years 2 & 3
    let renewalRate4plus = 0.05; // 5% for years 4 onwards

    if (policyType === 'endowment') {
        fycRate = 0.25; // Base 25% (up to 35% with bonus, but using standard base here)
    } else if (policyType === 'term') {
        fycRate = 0.25;
    } else if (policyType === 'moneyback') {
        fycRate = 0.20;
    } else if (policyType === 'single_premium') {
        fycRate = 0.02; // Single premium usually around 2%
        renewalRate2to3 = 0;
        renewalRate4plus = 0;
    }

    const firstYearCommission = policyPremium * fycRate;
    const renewalCommission2to3 = policyPremium * renewalRate2to3;
    const renewalCommission4plus = policyPremium * renewalRate4plus;

    // Task 7: Tool Usage Tracking (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event: 'tool_commission_calculator_used',
                policy_premium: policyPremium,
                policy_type: policyType,
                expected_fyc: firstYearCommission
            });
        }, 2000);

        return () => clearTimeout(timer);
    }, [policyPremium, policyType, firstYearCommission]);

    return (
        <div className="calculator-wrapper container py-12">

            <div className="breadcrumb mb-6">
                <Link href="/">Home</Link> / <Link href="/tools">Tools</Link> / <span>Commission Calculator</span>
            </div>

            <div className="calculator-header text-center">
                <h1>LIC Commission Breakdown Calculator</h1>
                <p>Calculate exact first-year and hereditary renewal commission brackets based on policy types.</p>
            </div>

            <div className="calculator-grid">
                {/* Inputs Column */}
                <div className="calculator-card inputs-section">
                    <h3>Policy Details</h3>

                    <div className="input-group">
                        <label htmlFor="premium">Yearly Policy Premium (₹)</label>
                        <input
                            type="number"
                            id="premium"
                            value={policyPremium}
                            onChange={(e) => setPolicyPremium(Number(e.target.value))}
                            min="5000"
                            max="5000000"
                        />
                        <div className="range-slider">
                            <input
                                type="range"
                                min="10000" max="500000" step="5000"
                                value={policyPremium}
                                onChange={(e) => setPolicyPremium(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label htmlFor="policyType">Select Policy Category</label>
                        <select
                            id="policyType"
                            value={policyType}
                            onChange={(e) => setPolicyType(e.target.value)}
                            className="w-full p-3 border rounded-md"
                        >
                            <option value="endowment">Endowment / Whole Life Plans (Most Common)</option>
                            <option value="term">Term Insurance Plans</option>
                            <option value="moneyback">Money Back Plans</option>
                            <option value="single_premium">Single Premium Plans</option>
                        </select>
                    </div>
                </div>

                {/* Results Column */}
                <div className="calculator-card results-section">
                    <h3>Commission Breakdown</h3>

                    <table className="commission-table w-full mb-6">
                        <thead>
                            <tr>
                                <th className="text-left">Policy Year</th>
                                <th className="text-right">Commission Rate</th>
                                <th className="text-right">Earned Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-green-50">
                                <td className="font-semibold">Year 1 (FYC)</td>
                                <td className="text-right">{fycRate * 100}%</td>
                                <td className="text-right font-bold text-green-700">₹{firstYearCommission.toLocaleString('en-IN')}</td>
                            </tr>
                            <tr>
                                <td>Year 2 & 3</td>
                                <td className="text-right">{renewalRate2to3 * 100}%</td>
                                <td className="text-right">₹{renewalCommission2to3.toLocaleString('en-IN')} / yr</td>
                            </tr>
                            <tr>
                                <td>Year 4 Onwards</td>
                                <td className="text-right">{renewalRate4plus * 100}%</td>
                                <td className="text-right">₹{renewalCommission4plus.toLocaleString('en-IN')} / yr</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="result-highlight">
                        <span>Total Passive Income (if term is 20 yrs)</span>
                        <h2>₹{(firstYearCommission + (renewalCommission2to3 * 2) + (renewalCommission4plus * 17)).toLocaleString('en-IN')}</h2>
                        <span className="text-sm font-normal text-gray-500 block mt-1">From a single policy sale.</span>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="calculator-cta text-center mt-12 mb-6">
                <h2>Build massive passive wealth.</h2>
                <p>Start Your LIC Career Today with our Bima Sakhi guidance program.</p>
                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
                    <Link href="/eligibility">
                        <Button variant="primary" size="large">
                            Check Eligibility & Apply Now
                        </Button>
                    </Link>
                    <Link href="/resources">
                        <Button variant="outline" size="large">
                            Download LIC Commission Chart 📊
                        </Button>
                    </Link>
                </div>
            </div>

        </div>
    );
};

export default CommissionCalculator;
