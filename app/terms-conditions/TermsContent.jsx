'use client';

import { useEffect, useContext } from 'react';
import { UserContext } from '@/context/UserContext';

const TermsContent = () => {
    const { markPageVisited } = useContext(UserContext);
    useEffect(() => { markPageVisited('terms'); }, []);

    return (
        <div className="container py-8 max-w-3xl">
            <h1 className="text-3xl font-bold mb-6">Terms & Conditions</h1>

            <div className="prose">
                <p>Welcome to bimasakhi.com, operated by IMIAH Services. By accessing or using this website, you agree to comply with the following Terms & Conditions.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">1. Nature of the Platform</h3>
                <p>Bima Sakhi is an independent informational and application facilitation platform created to help interested candidates learn about and apply for women-focused LIC agency opportunities.</p>
                <p className="mt-2 font-semibold">This website is not the official website of Life Insurance Corporation of India (LIC).</p>

                <h3 className="text-xl font-bold mt-6 mb-2">2. Eligibility</h3>
                <p>The opportunity described on this platform is currently intended for:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Women candidates</li>
                    <li>Residents of Delhi NCR</li>
                    <li>Individuals meeting minimum educational criteria as prescribed by LIC</li>
                </ul>
                <p className="mt-2">Final eligibility, selection, training, and appointment are solely governed by LIC of India and its applicable rules.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">3. No Guarantee of Income or Appointment</h3>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>There is no guarantee of income, fixed salary, or employment.</li>
                    <li>Earnings, if any, are commission-based and depend entirely on individual performance.</li>
                    <li>Submission of an application does not guarantee selection or appointment as an LIC agent.</li>
                </ul>

                <h3 className="text-xl font-bold mt-6 mb-2">4. Role of IMIAH Services</h3>
                <p>IMIAH Services acts only as a facilitation and awareness provider. We do not have authority to issue appointments, guarantees, or official confirmations on behalf of LIC of India.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">5. User Responsibilities</h3>
                <p>By using this website, you agree that:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>The information you provide is accurate and truthful</li>
                    <li>You will not misuse the website or submit false details</li>
                    <li>You understand the nature of the opportunity before applying</li>
                </ul>

                <h3 className="text-xl font-bold mt-6 mb-2">6. Intellectual Property</h3>
                <p>All content on this website is the property of IMIAH Services unless otherwise stated. LIC trademarks, names, and logos belong to their respective owners and are used only for informational reference.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">7. Limitation of Liability</h3>
                <p>IMIAH Services shall not be held liable for:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Decisions taken by LIC of India</li>
                    <li>Rejection or non-selection of any application</li>
                    <li>Any indirect or consequential losses arising from use of this website</li>
                </ul>

                <h3 className="text-xl font-bold mt-6 mb-2">8. Modifications</h3>
                <p>We reserve the right to update or modify these Terms & Conditions at any time without prior notice. Continued use of the website constitutes acceptance of the revised terms.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">9. WhatsApp Communication</h3>
                <p>By submitting your application and providing consent, you agree that IMIAH Services / Bima Sakhi may communicate with you via WhatsApp Business Platform for purposes related to your application and recruitment process.</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Such communication does not constitute unsolicited marketing and is strictly limited to user-initiated interaction.</li>
                    <li>You may withdraw consent for WhatsApp communication at any time by replying "STOP" or by following the opt-out instructions shared in the message.</li>
                </ul>
            </div>
        </div>
    );
};

export default TermsContent;
