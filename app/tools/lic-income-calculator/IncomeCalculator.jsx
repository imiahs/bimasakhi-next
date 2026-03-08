'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import '@/styles/Tools.css';

const IncomeCalculator = () => {
    const [policiesPerMonth, setPoliciesPerMonth] = useState(10);
    const [averagePremium, setAveragePremium] = useState(25000);

    // Calculations based on the prompt exactly:
    const monthlyBusiness = policiesPerMonth * averagePremium;
    const firstYearCommission = monthlyBusiness * 0.35; // 35% commission

    // Task 7: Tool Usage Tracking (debounced)

    useEffect(() => {
        const timer = setTimeout(() => {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event: 'tool_income_calculator_used',
                policies_per_month: policiesPerMonth,
                average_premium: averagePremium,
                estimated_income: firstYearCommission
            });
        }, 2000);

        return () => clearTimeout(timer);
    }, [policiesPerMonth, averagePremium, firstYearCommission]);

    return (
        <div className="calculator-wrapper container py-12">

            <div className="breadcrumb mb-6">
                <Link href="/">Home</Link> / <Link href="/tools">Tools</Link> / <span>Income Calculator</span>
            </div>

            <div className="calculator-header text-center">
                <h1>LIC Agent Income Calculator</h1>
                <p>Estimate your potential earnings based on policy volume and premium sizes.</p>
            </div>

            <div className="calculator-grid">
                {/* Inputs Column */}
                <div className="calculator-card inputs-section">
                    <h3>Your Sales Estimates</h3>

                    <div className="input-group">
                        <label htmlFor="policies">Number of Policies Sold per Month</label>
                        <input
                            type="number"
                            id="policies"
                            value={policiesPerMonth}
                            onChange={(e) => setPoliciesPerMonth(Number(e.target.value))}
                            min="1"
                            max="500"
                        />
                        <div className="range-slider">
                            <input
                                type="range"
                                min="1" max="100"
                                value={policiesPerMonth}
                                onChange={(e) => setPoliciesPerMonth(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label htmlFor="premium">Average Premium per Policy (₹)</label>
                        <input
                            type="number"
                            id="premium"
                            value={averagePremium}
                            onChange={(e) => setAveragePremium(Number(e.target.value))}
                            min="1000"
                            max="1000000"
                        />
                        <div className="range-slider">
                            <input
                                type="range"
                                min="5000" max="200000" step="1000"
                                value={averagePremium}
                                onChange={(e) => setAveragePremium(Number(e.target.value))}
                            />
                        </div>
                    </div>
                </div>

                {/* Results Column */}
                <div className="calculator-card results-section">
                    <h3>Income Breakdown</h3>

                    <div className="result-row">
                        <span>Total Monthly Business Generated:</span>
                        <strong>₹{monthlyBusiness.toLocaleString('en-IN')}</strong>
                    </div>

                    <p className="calc-note text-sm text-gray-500 mb-4">*Assuming a standard 35% First-Year Commission structure.</p>

                    <div className="result-highlight">
                        <span>Estimated Monthly Income</span>
                        <h2>₹{firstYearCommission.toLocaleString('en-IN')}</h2>
                    </div>

                    <div className="result-highlight yearly">
                        <span>Estimated Yearly Income</span>
                        <h2>₹{(firstYearCommission * 12).toLocaleString('en-IN')}</h2>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="calculator-cta text-center mt-12 mb-6">
                <h2>Ready to turn these estimates into reality?</h2>
                <p>Start Your LIC Career Today with the Bima Sakhi program. Zero investment required.</p>
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

export default IncomeCalculator;
