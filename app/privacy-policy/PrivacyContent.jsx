'use client';

import { useEffect, useContext } from 'react';
import { UserContext } from '@/context/UserContext';
import Link from 'next/link';

const PrivacyContent = () => {
    const { markPageVisited } = useContext(UserContext);

    useEffect(() => {
        markPageVisited('privacy');
    }, []);

    return (
        <div className="container max-w-4xl mx-auto px-4 py-8 sm:py-12 text-slate-800 leading-relaxed">
            {/* Header Section */}
            <header className="mb-8 border-b border-slate-200 pb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-3">
                    Legal & Transparency Disclosure
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    Privacy Policy
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-500 mt-3">
                    <span><strong>Effective Date:</strong> January 2026</span>
                    <span className="hidden sm:inline">•</span>
                    <span><strong>Last Updated:</strong> July 2026</span>
                </div>
            </header>

            {/* Our Privacy Promise Box */}
            <section id="privacy-promise" className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 sm:p-8 mb-8 shadow-md">
                <div className="flex items-center gap-3 mb-3">
                    <span className="p-2 bg-white/20 rounded-lg text-xs font-bold uppercase tracking-wider">OUR COMMITMENT</span>
                    <h2 className="text-xl font-bold text-white m-0">Our Privacy Promise</h2>
                </div>
                <p className="text-sm sm:text-base text-blue-100 mb-4">
                    Your trust is the foundation of our recruitment platform. We promise to protect your personal information with absolute clarity:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-blue-50">
                    <div className="flex items-start gap-2 bg-white/10 p-3 rounded-xl backdrop-blur-xs">
                        <span>✨</span>
                        <span>We collect only the information necessary to guide you through the agency recruitment process.</span>
                    </div>
                    <div className="flex items-start gap-2 bg-white/10 p-3 rounded-xl backdrop-blur-xs">
                        <span>🛡️</span>
                        <span>We <strong>never sell or rent</strong> your personal data to marketers or data brokers.</span>
                    </div>
                    <div className="flex items-start gap-2 bg-white/10 p-3 rounded-xl backdrop-blur-xs">
                        <span>📞</span>
                        <span>We communicate strictly for recruitment, application guidance, and onboarding purposes.</span>
                    </div>
                    <div className="flex items-start gap-2 bg-white/10 p-3 rounded-xl backdrop-blur-xs">
                        <span>⚙️</span>
                        <span>You remain in full control of your information with easy consent withdrawal options.</span>
                    </div>
                </div>
            </section>

            {/* Quick Privacy Summary (30-Second Read) */}
            <section id="privacy-summary" className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 mb-10 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                    <span className="p-2 bg-slate-900 text-white rounded-lg font-bold text-xs uppercase">SUMMARY</span>
                    <h2 className="text-xl font-bold text-slate-900 m-0">Privacy Summary (30-Second Overview)</h2>
                </div>
                <p className="text-sm sm:text-base text-slate-700 mb-4">
                    At <strong>BimaSakhi.com</strong> (operated by <strong>IMIAH Services</strong>), candidate trust and data privacy are paramount. Key details in under 30 seconds:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        <strong className="text-slate-900 block mb-1">📋 What Info We Collect</strong>
                        <span>Contact details provided voluntarily (Name, Mobile, Email, Location, Qualification) plus standard technical usage logs.</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        <strong className="text-slate-900 block mb-1">🎯 Purpose & Scope</strong>
                        <span>Strictly candidate awareness, guidance, and LIC agency recruitment assistance. We <strong>do not sell insurance policies</strong> or collect premiums.</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        <strong className="text-slate-900 block mb-1">📲 Communication Policy</strong>
                        <span>Recruitment status updates via Call, SMS, Email, or WhatsApp. No spam. Easy opt-out available anytime.</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        <strong className="text-slate-900 block mb-1">🔒 Zero Data Selling</strong>
                        <span>We <strong>never sell or rent</strong> your personal information to third-party data brokers or external marketing lists.</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        <strong className="text-slate-900 block mb-1">🏢 Ownership & Independence</strong>
                        <span>Independently operated by <strong>IMIAH Services</strong>. Not the official website of Life Insurance Corporation of India (LIC).</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        <strong className="text-slate-900 block mb-1">⚖️ Your Rights (DPDP Act 2023)</strong>
                        <span>Prepared considering DPDP Act 2023 principles. You have full rights to access, correct, delete, or withdraw consent.</span>
                    </div>
                </div>
            </section>

            {/* Table of Contents */}
            <nav aria-label="Table of Contents" className="bg-slate-50 border border-slate-200 rounded-xl p-5 sm:p-6 mb-10">
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">Table of Contents</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-sm">
                    <a href="#company-identity" className="text-blue-700 hover:text-blue-900 hover:underline">1. Business Identity & Independence</a>
                    <a href="#recruitment-positioning" className="text-blue-700 hover:text-blue-900 hover:underline">2. Scope & Recruitment Positioning</a>
                    <a href="#lawful-basis" className="text-blue-700 hover:text-blue-900 hover:underline">3. Lawful Basis for Data Processing</a>
                    <a href="#info-collected" className="text-blue-700 hover:text-blue-900 hover:underline">4. Information We Collect</a>
                    <a href="#info-accuracy" className="text-blue-700 hover:text-blue-900 hover:underline">5. Accuracy of Submitted Information</a>
                    <a href="#purpose-of-collection" className="text-blue-700 hover:text-blue-900 hover:underline">6. Purpose of Data Processing</a>
                    <a href="#fraud-prevention" className="text-blue-700 hover:text-blue-900 hover:underline">7. Fraud Prevention & System Integrity</a>
                    <a href="#automated-decisions" className="text-blue-700 hover:text-blue-900 hover:underline">8. Automated Decision Making Notice</a>
                    <a href="#cookies-tracking" className="text-blue-700 hover:text-blue-900 hover:underline">9. Cookies & Tracking Technologies</a>
                    <a href="#google-services" className="text-blue-700 hover:text-blue-900 hover:underline">10. Google Services & Ad Analytics</a>
                    <a href="#communication-policy" className="text-blue-700 hover:text-blue-900 hover:underline">11. Communication Policy & Express Consent</a>
                    <a href="#whatsapp-disclosure" className="text-blue-700 hover:text-blue-900 hover:underline">12. WhatsApp Business & Consent Withdrawal</a>
                    <a href="#data-sharing" className="text-blue-700 hover:text-blue-900 hover:underline">13. Data Sharing & Technical Partners</a>
                    <a href="#no-data-selling" className="text-blue-700 hover:text-blue-900 hover:underline">14. Zero Data Selling Guarantee</a>
                    <a href="#data-security" className="text-blue-700 hover:text-blue-900 hover:underline">15. Technical Data Security Safeguards</a>
                    <a href="#data-retention" className="text-blue-700 hover:text-blue-900 hover:underline">16. Data Retention & Legal Exceptions</a>
                    <a href="#user-rights" className="text-blue-700 hover:text-blue-900 hover:underline">17. User Rights & Right to Complain</a>
                    <a href="#dpdp-act" className="text-blue-700 hover:text-blue-900 hover:underline">18. Alignment with DPDP Act, 2023</a>
                    <a href="#children-privacy" className="text-blue-700 hover:text-blue-900 hover:underline">19. Children's Privacy Notice</a>
                    <a href="#international-processing" className="text-blue-700 hover:text-blue-900 hover:underline">20. International Processing & External Links</a>
                    <a href="#policy-updates" className="text-blue-700 hover:text-blue-900 hover:underline">21. Policy Updates & Revision Notices</a>
                    <a href="#contact-info" className="text-blue-700 hover:text-blue-900 hover:underline">22. Official Contact & Support Details</a>
                </div>
            </nav>

            {/* Main Content Body */}
            <div className="prose prose-slate max-w-none space-y-8">

                {/* 1. Business Identity & Independence */}
                <section id="company-identity" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        1. Business Identity & Trademark Independence Statement
                    </h2>
                    <p className="text-slate-700">
                        This website, <strong>BimaSakhi.com</strong>, is owned, operated, and managed by <strong>IMIAH Services</strong>.
                    </p>

                    {/* Trademark Box */}
                    <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-5 my-4 text-amber-950 text-sm">
                        <p className="font-semibold text-amber-900 mb-2">📢 Important Ownership & Trademark Disclaimer:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>BimaSakhi.com is independently operated by IMIAH Services.</strong></li>
                            <li><strong>This is not the official website of Life Insurance Corporation of India (LIC).</strong></li>
                            <li><strong>LIC® is a registered trademark of Life Insurance Corporation of India.</strong> Mention of LIC on this platform is solely for descriptive purposes to inform eligible candidates about agency recruitment opportunities and guidance.</li>
                        </ul>
                    </div>
                </section>

                {/* 2. Scope & Recruitment Positioning */}
                <section id="recruitment-positioning" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        2. Scope & Recruitment Positioning Disclosure
                    </h2>
                    <p className="text-slate-700 mb-3">
                        BimaSakhi.com is an independent candidate awareness, guidance, education, orientation, and recruitment assistance platform designed to assist eligible individuals interested in becoming LIC agents.
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm space-y-3">
                        <div className="font-semibold text-slate-900">Platform Operating Boundaries:</div>
                        <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                            <li><strong className="text-emerald-700">What We Do:</strong> Provide candidate education, agency career guidance, eligibility pre-screening, orientation support, and recruitment facilitation for prospective LIC agents.</li>
                            <li><strong className="text-rose-700">What We DO NOT Do:</strong> This platform does <strong>NOT sell insurance policies</strong>, does <strong>NOT collect policy premiums</strong>, does <strong>NOT issue insurance policies</strong>, does <strong>NOT provide investment advice</strong>, and does <strong>NOT offer financial advisory services</strong>.</li>
                        </ul>
                    </div>
                </section>

                {/* 3. Lawful Basis for Data Processing */}
                <section id="lawful-basis" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        3. Lawful Basis for Data Processing
                    </h2>
                    <p className="text-slate-700 mb-3 text-sm">
                        We collect and process your personal information based on clear legal grounds:
                    </p>
                    <ul className="list-disc pl-6 space-y-1.5 text-slate-700 text-sm">
                        <li><strong>User Consent:</strong> When you voluntarily submit your details through our application or inquiry forms requesting recruitment assistance.</li>
                        <li><strong>Legitimate Business Interests:</strong> Providing career guidance, candidate pre-screening, interview coordination, and improving site functionality.</li>
                        <li><strong>Legal Compliance:</strong> Where processing or recordkeeping is necessary to comply with applicable statutory or legal obligations under Indian law.</li>
                    </ul>
                </section>

                {/* 4. Information We Collect */}
                <section id="info-collected" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        4. Information We Collect
                    </h2>
                    <p className="text-slate-700 mb-4">
                        To fulfill our recruitment assistance services, we collect information in two main categories:
                    </p>

                    <h3 className="text-lg font-bold text-slate-900 mt-4 mb-2">A. User-Submitted Personal Information</h3>
                    <p className="text-slate-700 text-sm mb-2">When you fill out an application form or request guidance, you voluntarily provide:</p>
                    <ul className="list-disc pl-6 space-y-1 text-sm text-slate-700 mb-4">
                        <li><strong>Full Name:</strong> To identify applicant records.</li>
                        <li><strong>Mobile Number:</strong> To contact you regarding application status and interview schedules.</li>
                        <li><strong>Email Address:</strong> For written updates, guides, and recruitment notifications.</li>
                        <li><strong>Location Details:</strong> City, State, Locality, and PIN Code to evaluate branch suitability.</li>
                        <li><strong>Educational Qualification & Occupation:</strong> Highest qualification completed and current status to assess eligibility.</li>
                        <li><strong>Messages & Inquiry Content:</strong> Any details provided in contact forms or chat tools.</li>
                    </ul>

                    <h3 className="text-lg font-bold text-slate-900 mt-4 mb-2">B. Automatically Collected Technical Data</h3>
                    <p className="text-slate-700 text-sm mb-2">Standard non-personally identifiable technical information logged automatically during site visits:</p>
                    <ul className="list-disc pl-6 space-y-1 text-sm text-slate-700">
                        <li><strong>Device & Network Details:</strong> IP Address, browser type, operating system, and hardware model.</li>
                        <li><strong>Usage & Navigation:</strong> Referring URL, visited pages, date and time stamp, session duration, and click metrics.</li>
                        <li><strong>Campaign Attribution:</strong> Advertising identifiers and campaign UTM parameters (where applicable).</li>
                        <li><strong>Log Files & Local Storage:</strong> Server log files and functional session storage.</li>
                    </ul>

                    <p className="mt-4 text-xs text-slate-500 bg-slate-100 p-3 rounded-lg border border-slate-200">
                        <strong>Note on Sensitive Personal Data:</strong> BimaSakhi does not solicit, collect, or store sensitive financial details (such as credit card numbers, banking credentials, UPI IDs, or Aadhaar numbers) on this website.
                    </p>
                </section>

                {/* 5. Accuracy of Submitted Information */}
                <section id="info-accuracy" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        5. Accuracy of Submitted Information
                    </h2>
                    <p className="text-slate-700 text-sm">
                        Candidates submitting application forms or inquiries on BimaSakhi.com are responsible for ensuring that all details provided (including name, contact number, age eligibility, and educational background) are true, complete, and accurate. Submitting false or misleading information may affect your agency recruitment eligibility.
                    </p>
                </section>

                {/* 6. Purpose of Data Processing */}
                <section id="purpose-of-collection" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        6. Purpose of Data Processing
                    </h2>
                    <p className="text-slate-700 mb-3">
                        We process collected information strictly for legitimate recruitment assistance and website operational purposes:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700 text-sm">
                        <li><strong>Recruitment Eligibility Pre-Screening:</strong> Assessing basic educational background and age criteria for agency onboarding.</li>
                        <li><strong>Candidate Communication:</strong> Updating applicants on progress, interview schedules, orientation sessions, and document verification steps.</li>
                        <li><strong>Applicant Support:</strong> Addressing candidate queries and providing platform support.</li>
                        <li><strong>Website Performance Optimization:</strong> Improving navigation speed, usability, and mobile responsiveness.</li>
                        <li><strong>Advertising Measurement:</strong> Evaluating campaign efficiency and traffic attribution across digital channels (where implemented).</li>
                    </ul>
                </section>

                {/* 7. Fraud Prevention & System Integrity */}
                <section id="fraud-prevention" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        7. Fraud Prevention & System Integrity
                    </h2>
                    <p className="text-slate-700 text-sm">
                        We utilize automated technical logs and security monitoring tools to detect fraudulent form submissions, prevent spam, block abusive bots, and maintain the integrity and security of our platform servers.
                    </p>
                </section>

                {/* 8. Automated Decision Making Notice */}
                <section id="automated-decisions" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        8. Automated Decision Making Notice
                    </h2>
                    <p className="text-slate-700 text-sm">
                        We do not make automated decisions that produce legal or similarly significant effects solely based on the personal information you submit. Recruitment guidance and application-related decisions may involve human review and assessment where applicable.
                    </p>
                </section>

                {/* 9. Cookies & Tracking Technologies */}
                <section id="cookies-tracking" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        9. Cookies & Tracking Technologies
                    </h2>
                    <p className="text-slate-700 mb-3">
                        Cookies are small text files stored on your browser or device when visiting web pages. We use cookies and similar browser storage to ensure site security, remember form preferences, and analyze general traffic performance.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm my-4">
                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                            <strong className="text-slate-900 block mb-1">Essential & Security Cookies</strong>
                            <p className="text-xs text-slate-600">Necessary for core website navigation, page load speed, and firewall security.</p>
                        </div>
                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                            <strong className="text-slate-900 block mb-1">Functional & Preference Cookies</strong>
                            <p className="text-xs text-slate-600">Remember user preferences (such as form field defaults) for smoother browsing.</p>
                        </div>
                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                            <strong className="text-slate-900 block mb-1">Analytics Cookies</strong>
                            <p className="text-xs text-slate-600">Help us monitor general visitor volume and page performance in aggregate.</p>
                        </div>
                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                            <strong className="text-slate-900 block mb-1">Advertising Attribution Cookies</strong>
                            <p className="text-xs text-slate-600">Measure recruitment ad conversion efficiency (where third-party analytics are active).</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-600">
                        You can adjust your browser settings to decline or delete cookies at any time. Disabling cookies may affect certain interactive features of our website.
                    </p>
                </section>

                {/* 10. Google Services & Ad Analytics */}
                <section id="google-services" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        10. Google Services & Ad Analytics Disclosures
                    </h2>
                    <p className="text-slate-700 mb-3">
                        Where implemented and applicable, BimaSakhi.com uses standard Google web services to analyze traffic and measure recruitment campaign effectiveness:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-sm text-slate-700">
                        <li><strong>Google Analytics:</strong> Collects aggregated, non-personally identifiable technical usage metrics to help us improve user experience and readability.</li>
                        <li><strong>Google Ads & Conversion Tracking:</strong> Measures application submission completion rates to ensure recruitment guidance reaches relevant candidates efficiently.</li>
                        <li><strong>Enhanced Conversions & Privacy Signals (where enabled):</strong> If implemented in the future, privacy-compliant hashed data signals (such as SHA-256 hashed emails/phones) may be utilized to measure ad conversion accuracy while safeguarding applicant confidentiality.</li>
                    </ul>
                    <p className="text-xs text-slate-500 mt-3">
                        Google processes data in accordance with the <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Privacy Policy</a>. Visitors can manage Google Ad settings via <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Ads Settings</a>.
                    </p>
                </section>

                {/* 11. Communication Policy & Express Consent */}
                <section id="communication-policy" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        11. Communication Policy & Express Consent
                    </h2>
                    <p className="text-slate-700 mb-3">
                        By submitting your details on BimaSakhi.com and giving express consent, you authorize IMIAH Services / BimaSakhi to contact you regarding agency candidate guidance via:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm text-slate-700 mb-4">
                        <li>Telephonic Voice Call</li>
                        <li>Short Message Service (SMS)</li>
                        <li>Electronic Mail (Email)</li>
                        <li>WhatsApp Business Platform</li>
                    </ul>
                    <p className="text-sm bg-blue-50 border-l-4 border-blue-600 p-4 text-blue-900 rounded-r-lg">
                        <strong>DND (Do Not Disturb) Policy Authorization:</strong> You explicitly acknowledge that by voluntarily submitting your contact details, you request to receive recruitment-related communications even if your mobile number is registered under National Customer Preference Register (NCPR / DND). Communications remain strictly confined to your recruitment application and guidance.
                    </p>
                </section>

                {/* 12. WhatsApp Business & Consent Withdrawal */}
                <section id="whatsapp-disclosure" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        12. WhatsApp Business Communication & Consent Withdrawal
                    </h2>
                    <p className="text-slate-700 mb-3">
                        IMIAH Services / BimaSakhi uses the official WhatsApp Business Platform to share application updates, interview schedules, orientation information, and recruitment guidance.
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm space-y-3">
                        <strong className="text-slate-900 block">Consent Withdrawal & Opt-Out Methods:</strong>
                        <p className="text-xs sm:text-sm text-slate-700">
                            We respect your communication choices. You may withdraw your consent or opt out of communications at any time through any of the following simple methods:
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 text-slate-700 text-xs sm:text-sm">
                            <li><strong>WhatsApp Opt-Out:</strong> Reply <strong>"STOP"</strong> or <strong>"UNSUBSCRIBE"</strong> directly in the WhatsApp chat.</li>
                            <li><strong>Email Communication Opt-Out:</strong> If you no longer wish to receive recruitment-related email communications, you may request us to stop future emails by contacting us at <strong>support@bimasakhi.com</strong>. We will process your request within a reasonable time.</li>
                            <li><strong>Direct Request:</strong> Email us at <strong>support@bimasakhi.com</strong> with your registered mobile number requesting communication stoppage.</li>
                        </ul>
                    </div>
                </section>

                {/* 13. Data Sharing & Technical Partners */}
                <section id="data-sharing" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        13. Data Sharing & Technical Service Partners
                    </h2>
                    <p className="text-slate-700 mb-3 text-sm">
                        To operate our recruitment assistance platform, candidate information may be securely processed by trusted third-party technical vendors under strict confidentiality obligations:
                    </p>
                    <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-700 mb-4">
                        <li><strong>Customer Relationship Management (CRM):</strong> Organizing applicant records and tracking follow-up schedules.</li>
                        <li><strong>Communication APIs:</strong> Email delivery services and WhatsApp Cloud API infrastructure.</li>
                        <li><strong>Web Hosting & Security:</strong> Cloud servers maintaining website uptime, SSL encryption, and firewall security.</li>
                    </ul>
                    <p className="text-xs text-slate-600 mb-3">
                        All technical service vendors are contractually bound to maintain data confidentiality and are strictly prohibited from using your data for any independent marketing purpose.
                    </p>
                    <p className="text-xs text-slate-600 bg-slate-100 p-3 rounded-lg border border-slate-200">
                        <strong>Technology Providers Disclaimer:</strong> The third-party technologies and service providers mentioned in this Privacy Policy are provided as examples of services that may support our operations. These providers may change from time to time as our platform evolves, while continuing to maintain appropriate privacy and security standards.
                    </p>
                </section>

                {/* 14. Zero Data Selling Guarantee */}
                <section id="no-data-selling" className="scroll-mt-20">
                    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 text-emerald-950 shadow-xs">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="p-2 bg-emerald-600 text-white rounded-lg font-bold text-xs uppercase">GUARANTEE</span>
                            <h2 className="text-lg sm:text-xl font-bold text-emerald-900 m-0">
                                14. Absolute Zero Data Selling Guarantee
                            </h2>
                        </div>
                        <p className="text-sm font-semibold text-emerald-900 mb-2">
                            We NEVER sell, rent, trade, lease, or monetize your personal information to third-party data brokers, marketing agencies, or external spam callers.
                        </p>
                        <p className="text-xs sm:text-sm text-emerald-800">
                            Your contact details are retained exclusively by IMIAH Services to assist you with LIC agency candidate guidance and recruitment as disclosed in this policy.
                        </p>
                    </div>
                </section>

                {/* 15. Technical Data Security Safeguards */}
                <section id="data-security" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        15. Technical Data Security Safeguards
                    </h2>
                    <p className="text-slate-700 mb-3 text-sm">
                        IMIAH Services implements reasonable administrative, technical, and physical safeguards to protect candidate information against unauthorized access, loss, or misuse:
                    </p>
                    <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-700 mb-4">
                        <li><strong>HTTPS / SSL Encryption:</strong> All data transmitted between your browser and our servers is encrypted in transit.</li>
                        <li><strong>Access Controls:</strong> Candidate records are accessible only by authorized recruitment support staff on a strict need-to-know basis.</li>
                        <li><strong>Server Infrastructure Security:</strong> Cloud servers protected by standard firewalls, security monitoring, and regular software patches.</li>
                    </ul>
                    <p className="text-xs text-slate-500 bg-slate-100 p-3 rounded-lg">
                        <strong>Security Note:</strong> While we maintain industry-standard security safeguards, no method of transmission over the internet or digital storage system is 100% immune. Therefore, we cannot guarantee absolute security against all unauthorized cyber threats.
                    </p>
                </section>

                {/* 16. Data Retention & Legal Exceptions */}
                <section id="data-retention" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        16. Data Retention & Legal Exceptions
                    </h2>
                    <p className="text-slate-700 text-sm mb-3">
                        We retain candidate personal information only as long as necessary to fulfill candidate guidance and recruitment operational requirements.
                    </p>
                    <p className="text-slate-700 text-sm">
                        Candidate records are securely deleted or anonymized upon user request, <strong>unless retention is required under applicable laws, regulatory compliance, or statutory recordkeeping obligations</strong> in India.
                    </p>
                </section>

                {/* 17. User Rights & Right to Complain */}
                <section id="user-rights" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        17. User Rights & Right to Complain
                    </h2>
                    <p className="text-slate-700 text-sm mb-3">
                        Subject to applicable laws, platform users and candidate applicants possess the following data privacy rights:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-sm text-slate-700">
                        <li><strong>Right to Access:</strong> Request a copy of the personal information held about you.</li>
                        <li><strong>Right to Correction:</strong> Request update or correction of inaccurate or incomplete details.</li>
                        <li><strong>Right to Erasure / Deletion:</strong> Request deletion of your record from active recruitment databases (subject to legal retention exceptions).</li>
                        <li><strong>Right to Withdraw Consent:</strong> Withdraw consent for communication or data processing at any time.</li>
                        <li><strong>Right to Complain:</strong> If you believe your data privacy rights have been violated, you have the right to lodge a complaint with relevant data protection authorities under applicable Indian law.</li>
                    </ul>
                    <p className="text-xs text-slate-600 mt-3">
                        To exercise your rights, please submit a written request to <strong>support@bimasakhi.com</strong>.
                    </p>
                </section>

                {/* 18. Alignment with DPDP Act, 2023 */}
                <section id="dpdp-act" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        18. Alignment with Digital Personal Data Protection Act, 2023
                    </h2>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm space-y-2">
                        <p className="text-slate-800">
                            <strong>This Privacy Policy has been prepared considering the principles of the Digital Personal Data Protection Act, 2023 (DPDP Act, India).</strong>
                        </p>
                        <p className="text-slate-700 text-xs sm:text-sm">
                            As a Data Fiduciary regarding candidate submissions, IMIAH Services endeavors to process personal data lawfully, fairly, and transparently for specified legitimate recruitment purposes with user consent and respect for Data Principal rights.
                        </p>
                    </div>
                </section>

                {/* 19. Children's Privacy Notice */}
                <section id="children-privacy" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        19. Children's Privacy Notice (18+ Age Limit)
                    </h2>
                    <p className="text-slate-700 text-sm">
                        BimaSakhi.com is intended exclusively for adult candidate applicants aged <strong>18 years or older</strong> eligible to pursue agency opportunities. We do not knowingly collect personal data from individuals under 18. If we identify that an applicant is under 18, their record will be deleted promptly.
                    </p>
                </section>

                {/* 20. International Processing & External Links */}
                <section id="international-processing" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        20. International Data Processing & External Links
                    </h2>
                    <p className="text-slate-700 text-sm mb-3">
                        While IMIAH Services is based in India, certain technical cloud infrastructure or communication APIs (such as WhatsApp Cloud API or web servers) may process encrypted data on servers located outside India as permitted under applicable regulations.
                    </p>
                    <p className="text-slate-700 text-sm">
                        Our site may contain links to external third-party portals (such as licindia.in). We are not responsible for the independent privacy policies or practices of third-party websites.
                    </p>
                </section>

                {/* 21. Policy Updates & Revision Notices */}
                <section id="policy-updates" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        21. Policy Updates & Revision Notices
                    </h2>
                    <p className="text-slate-700 text-sm">
                        IMIAH Services may update this Privacy Policy periodically to reflect operational changes or statutory requirements. Updates will be posted on this page with an updated "Last Updated" date. Continued use of BimaSakhi.com signifies acceptance of the revised policy.
                    </p>
                </section>

                {/* 22. Official Contact & Support Details */}
                <section id="contact-info" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        22. Official Contact & Support Details
                    </h2>
                    <p className="text-slate-700 text-sm mb-4">
                        If you have questions, feedback, or privacy requests regarding this Privacy Policy or your personal information, please reach out to our team:
                    </p>

                    <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 sm:p-8 shadow-md">
                        <div className="text-lg font-bold text-white mb-1">IMIAH SERVICES</div>
                        <div className="text-xs text-blue-400 font-semibold mb-4 uppercase tracking-wider">
                            Operating Entity of BimaSakhi.com
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-slate-300">
                            <div>
                                <strong className="text-slate-100 block mb-1">Operating Location:</strong>
                                <p className="text-xs leading-relaxed text-slate-300">
                                    Krishna Nagar, East Delhi,<br />
                                    Delhi – 110051, India.
                                </p>
                            </div>
                            <div>
                                <strong className="text-slate-100 block mb-1">Direct Support Contact:</strong>
                                <p className="text-xs leading-relaxed text-slate-300">
                                    <strong>Email:</strong> <a href="mailto:support@bimasakhi.com" className="text-blue-400 hover:underline">support@bimasakhi.com</a><br />
                                    <strong>Phone:</strong> <a href="tel:+919311073365" className="text-blue-400 hover:underline">+91-9311073365</a>
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Related Legal Pages */}
                <div className="border-t border-slate-200 pt-8 mt-12 text-center text-sm text-slate-500">
                    <p className="mb-3">Related Legal & Platform Documents:</p>
                    <div className="flex flex-wrap justify-center gap-4 text-blue-700 font-medium">
                        <Link href="/disclaimer" className="hover:underline">Disclaimer</Link>
                        <span>•</span>
                        <Link href="/terms-and-conditions" className="hover:underline">Terms & Conditions</Link>
                        <span>•</span>
                        <Link href="/contact" className="hover:underline">Contact Us</Link>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PrivacyContent;
