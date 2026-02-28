'use client';

import { useEffect, useContext } from 'react';
import { UserContext } from '@/context/UserContext';

const PrivacyContent = () => {
    const { markPageVisited } = useContext(UserContext);
    useEffect(() => { markPageVisited('privacy'); }, []);

    return (
        <div className="container py-8 max-w-3xl">
            <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
            <p className="mb-4">Last Updated: January 2026</p>

            <div className="prose">
                <p>At Bima Sakhi, operated by IMIAH Services, we respect your privacy and are committed to protecting the personal information you share with us. This Privacy Policy explains how your information is collected, used, stored, and protected when you visit or submit details on bimasakhi.com.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">1. Information We Collect</h3>
                <p>We may collect the following information when you voluntarily submit an application or interact with our website:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Full Name</li>
                    <li>Mobile Number</li>
                    <li>Email Address</li>
                    <li>City, State, Pincode, and Locality</li>
                    <li>Educational qualification and current status</li>
                    <li>Any other information you choose to provide during the application process</li>
                </ul>
                <p className="mt-2 text-sm text-gray-500">We do not collect sensitive personal data such as financial details, Aadhaar numbers, or banking information.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">2. Purpose of Data Collection</h3>
                <p>Your information is collected strictly for the following purposes:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>To assess basic eligibility for LIC agency opportunities</li>
                    <li>To contact you regarding your application and next steps</li>
                    <li>To share relevant information related to the career opportunity you applied for</li>
                    <li>To maintain internal records for recruitment follow-up</li>
                </ul>
                <p className="mt-2 text-sm text-gray-500">We do not sell, rent, or trade your personal data to third parties.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">3. Communication & Consent</h3>
                <p>By submitting your details and providing explicit consent on the application form, you authorize IMIAH Services / Bima Sakhi to contact you via:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Phone call</li>
                    <li>WhatsApp</li>
                    <li>SMS</li>
                    <li>Email</li>
                </ul>
                <p className="mt-2 font-semibold">Communication will be limited strictly to information related to your application and the associated career opportunity, even if your number is registered under the Do-Not-Disturb (DND) registry.</p>

                <h4 className="font-bold mt-4 mb-2">Additional WhatsApp Communication Notice</h4>
                <p>In addition to calls and emails, IMIAH Services / Bima Sakhi may use WhatsApp Business Platform (Cloud API) to communicate with applicants regarding their application status, interview scheduling, onboarding guidance, and other recruitment-related updates.</p>
                <p className="mt-2 text-sm text-gray-600">Messages sent via WhatsApp will be limited strictly to the purpose for which the user has provided consent and will not include unrelated promotional content. Users may opt out of WhatsApp communication at any time by replying "STOP" or by contacting us through the details provided on this website.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">4. Data Sharing & Third-Party Services</h3>
                <p>Your data may be securely processed or stored using trusted third-party tools strictly for operational purposes, such as:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Customer Relationship Management (CRM) systems</li>
                    <li>Communication platforms (WhatsApp / Email)</li>
                </ul>
                <p className="mt-2">These services are used only to facilitate the recruitment process and are required to maintain appropriate data protection standards.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">5. Data Security</h3>
                <p>We take reasonable technical and organizational measures to protect your personal information against unauthorized access, misuse, or disclosure. However, no method of transmission over the internet is completely secure, and we cannot guarantee absolute security.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">6. Data Retention</h3>
                <p>Your information is retained only as long as necessary for recruitment-related purposes or as required under applicable laws. You may request deletion of your data by contacting us.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">7. External Links</h3>
                <p>Our website may contain links to external websites, including the official LIC website. We are not responsible for the privacy practices or content of third-party websites.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">8. Changes to This Policy</h3>
                <p>We may update this Privacy Policy from time to time. Any changes will be reflected on this page with an updated revision date.</p>

                <h3 className="text-xl font-bold mt-6 mb-2">9. Contact Information</h3>
                <p>If you have any questions regarding this Privacy Policy or your data, you may contact us through the details provided on this website.</p>
            </div>
        </div>
    );
};

export default PrivacyContent;
