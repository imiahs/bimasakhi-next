'use client';

import { useEffect, useContext } from 'react';
import { UserContext } from '@/context/UserContext';
import Link from 'next/link';

const TermsContent = () => {
    const { markPageVisited } = useContext(UserContext);

    useEffect(() => {
        markPageVisited('terms');
    }, []);

    return (
        <div className="container max-w-4xl mx-auto px-4 py-8 sm:py-12 text-slate-800 leading-relaxed">
            {/* Header Section */}
            <header className="mb-8 border-b border-slate-200 pb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-3">
                    Legal & Operating Governance
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    Terms & Conditions
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-500 mt-3">
                    <span><strong>Effective Date:</strong> January 2026</span>
                    <span className="hidden sm:inline">•</span>
                    <span><strong>Last Updated:</strong> July 2026</span>
                </div>
            </header>

            {/* Terms Summary Box (30-Second Read) */}
            <section id="terms-summary" className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 mb-10 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                    <span className="p-2 bg-slate-900 text-white rounded-lg font-bold text-xs uppercase">SUMMARY</span>
                    <h2 className="text-xl font-bold text-slate-900 m-0">Terms Summary (30-Second Overview)</h2>
                </div>
                <p className="text-sm sm:text-base text-slate-700 mb-4">
                    Welcome to <strong>BimaSakhi.com</strong> (operated by <strong>IMIAH Services</strong>). By accessing or using this website, you agree to these Terms & Conditions. Key summary points:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        <strong className="text-slate-900 block mb-1">🤝 Agreement to Terms</strong>
                        <span>Using BimaSakhi.com signifies your acknowledgment and acceptance of these operating terms and platform guidelines.</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        <strong className="text-slate-900 block mb-1">🎯 Recruitment Purpose Only</strong>
                        <span>Independent candidate awareness and guidance platform for prospective LIC agents. We <strong>do not sell insurance policies</strong> or collect premiums.</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        <strong className="text-slate-900 block mb-1">🏢 Operating Entity & Independence</strong>
                        <span>Independently operated by <strong>IMIAH Services</strong>. Not the official website of Life Insurance Corporation of India (LIC).</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        <strong className="text-slate-900 block mb-1">🚫 No Selection/Income Guarantee</strong>
                        <span>Earnings are commission-based per LIC rules. Submission of an application does not guarantee selection, licensing, or appointment.</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        <strong className="text-slate-900 block mb-1">📋 Candidate Responsibility</strong>
                        <span>Applicants must ensure submitted details are true and independently verify official guidelines published by LIC of India.</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        <strong className="text-slate-900 block mb-1">⚖️ Jurisdiction</strong>
                        <span>Governed by the laws of India, with exclusive dispute jurisdiction residing in the competent courts of New Delhi, India.</span>
                    </div>
                </div>
            </section>

            {/* Table of Contents */}
            <nav aria-label="Table of Contents" className="bg-slate-50 border border-slate-200 rounded-xl p-5 sm:p-6 mb-10">
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">Table of Contents</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-sm">
                    <a href="#company-identity" className="text-blue-700 hover:text-blue-900 hover:underline">1. Business Identity & Independence</a>
                    <a href="#recruitment-positioning" className="text-blue-700 hover:text-blue-900 hover:underline">2. Scope & Recruitment Positioning</a>
                    <a href="#acceptance-terms" className="text-blue-700 hover:text-blue-900 hover:underline">3. Acceptance of Terms & Usage Agreement</a>
                    <a href="#candidate-eligibility" className="text-blue-700 hover:text-blue-900 hover:underline">4. Candidate Eligibility Criteria</a>
                    <a href="#recruitment-flow" className="text-blue-700 hover:text-blue-900 hover:underline">5. Recruitment Assistance Process</a>
                    <a href="#candidate-responsibilities" className="text-blue-700 hover:text-blue-900 hover:underline">6. Candidate Duties & Independent Verification</a>
                    <a href="#lic-rules-changes" className="text-blue-700 hover:text-blue-900 hover:underline">7. Changes in LIC Guidelines & Rules Notice</a>
                    <a href="#no-employment" className="text-blue-700 hover:text-blue-900 hover:underline">8. No Employment Relationship Disclosure</a>
                    <a href="#no-guarantee" className="text-blue-700 hover:text-blue-900 hover:underline">9. No Guarantee of Selection or Earnings</a>
                    <a href="#data-accuracy" className="text-blue-700 hover:text-blue-900 hover:underline">10. Accuracy of Submitted Information</a>
                    <a href="#educational-content" className="text-blue-700 hover:text-blue-900 hover:underline">11. Educational & Awareness Purpose</a>
                    <a href="#platform-misuse" className="text-blue-700 hover:text-blue-900 hover:underline">12. Misuse of Platform & System Integrity</a>
                    <a href="#ai-notice" className="text-blue-700 hover:text-blue-900 hover:underline">13. Automated Tools & AI Assistance Notice</a>
                    <a href="#communication-consent" className="text-blue-700 hover:text-blue-900 hover:underline">14. Communication Authorization & Opt-Out</a>
                    <a href="#intellectual-property" className="text-blue-700 hover:text-blue-900 hover:underline">15. Intellectual Property & Trademarks</a>
                    <a href="#website-availability" className="text-blue-700 hover:text-blue-900 hover:underline">16. Website Availability & Maintenance</a>
                    <a href="#third-party-links" className="text-blue-700 hover:text-blue-900 hover:underline">17. External Links & Governing Language</a>
                    <a href="#limitation-liability" className="text-blue-700 hover:text-blue-900 hover:underline">18. Limitation of Liability</a>
                    <a href="#governing-law" className="text-blue-700 hover:text-blue-900 hover:underline">19. Governing Law & Jurisdiction</a>
                    <a href="#terms-updates" className="text-blue-700 hover:text-blue-900 hover:underline">20. Revision of Terms & Notices</a>
                    <a href="#contact-info" className="text-blue-700 hover:text-blue-900 hover:underline">21. Official Support & Operating Contact</a>
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

                {/* 3. Acceptance of Terms & Usage Agreement */}
                <section id="acceptance-terms" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        3. Acceptance of Terms & Usage Agreement
                    </h2>
                    <p className="text-slate-700 text-sm">
                        By accessing, browsing, or submitting information through BimaSakhi.com, you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions and our <Link href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link>. If you do not agree with any part of these terms, please discontinue using the platform.
                    </p>
                </section>

                {/* 4. Candidate Eligibility Criteria */}
                <section id="candidate-eligibility" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        4. Candidate Eligibility Criteria
                    </h2>
                    <p className="text-slate-700 text-sm mb-3">
                        Career opportunities and recruitment assistance described on this platform are intended for individuals who satisfy basic qualification requirements:
                    </p>
                    <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-700 mb-3">
                        <li><strong>Age Limit:</strong> Candidates must be at least 18 years of age.</li>
                        <li><strong>Minimum Qualification:</strong> Completion of 10th standard or equivalent education (or as mandated by LIC guidelines).</li>
                        <li><strong>Location Suitability:</strong> Eligibility criteria and branch locations may vary depending on operational requirements.</li>
                    </ul>
                    <p className="text-xs text-slate-600">
                        Eligibility requirements may change over time depending on LIC policies, regulatory mandates, and operational guidelines.
                    </p>
                </section>

                {/* 5. Recruitment Assistance Process */}
                <section id="recruitment-flow" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        5. Recruitment Assistance Process & Decision Boundaries
                    </h2>
                    <p className="text-slate-700 text-sm mb-3">
                        BimaSakhi facilitates applicant orientation through structured steps: candidate registration, preliminary screening, document guidance, and training orientation.
                    </p>
                    <p className="text-sm bg-blue-50 border-l-4 border-blue-600 p-4 text-blue-900 rounded-r-lg">
                        <strong>Sole Authority Notice:</strong> IMIAH Services acts strictly as a guidance and recruitment facilitation provider. <strong>Final recruitment decisions, candidate selection, interview evaluations, training confirmations, and agent appointments remain solely with Life Insurance Corporation of India (LIC)</strong> as per its applicable rules and procedures.
                    </p>
                </section>

                {/* 6. Candidate Duties & Independent Verification */}
                <section id="candidate-responsibilities" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        6. Candidate Responsibilities & Independent Verification
                    </h2>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-slate-800 shadow-xs mb-4">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="p-2 bg-slate-900 text-white rounded-lg font-bold text-xs uppercase">NOTICE</span>
                            <strong className="text-slate-900 text-base">Independent Verification Encouraged</strong>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                            Before applying or making career decisions, candidates are strongly encouraged to independently review the latest eligibility criteria, commission structures, mandatory training requirements, exam protocols, and official guidelines published directly by LIC of India.
                        </p>
                    </div>
                </section>

                {/* 7. Changes in LIC Guidelines & Rules Notice */}
                <section id="lic-rules-changes" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        7. Changes in LIC Guidelines & Regulations Notice
                    </h2>
                    <p className="text-slate-700 text-sm">
                        Life Insurance Corporation of India (LIC) may update or modify its eligibility criteria, examination rules, training schedules, commission models, and agency appointment terms at any time without prior notice to this platform. Applicants should rely on the latest official guidelines issued by LIC of India during their onboarding process.
                    </p>
                </section>

                {/* 8. No Employment Relationship Disclosure */}
                <section id="no-employment" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        8. No Employment Relationship Disclosure
                    </h2>
                    <p className="text-slate-700 text-sm">
                        Submitting an application or receiving recruitment assistance on BimaSakhi.com does not create an employer-employee relationship, partnership, or joint venture between the applicant and IMIAH Services. LIC agents operate as independent commission-based agents under applicable regulations governed by LIC of India.
                    </p>
                </section>

                {/* 9. No Guarantee of Selection or Earnings */}
                <section id="no-guarantee" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        9. No Guarantee of Selection or Fixed Earnings
                    </h2>
                    <ul className="list-disc pl-6 space-y-2 text-sm text-slate-700">
                        <li><strong>No Selection Guarantee:</strong> Submitting your details on BimaSakhi.com does not guarantee selection, interview clearance, or agent licensing by LIC of India.</li>
                        <li><strong>No Fixed Salary:</strong> LIC agency is a performance-based career opportunity. Earnings consist of commissions based on insurance policies serviced by the agent as per LIC rules. There is no fixed salary or guaranteed income.</li>
                    </ul>
                </section>

                {/* 10. Accuracy of Submitted Information */}
                <section id="data-accuracy" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        10. Accuracy of Submitted Information
                    </h2>
                    <p className="text-slate-700 text-sm">
                        Candidates submitting application forms or inquiries are responsible for ensuring that all information provided (including full name, age, educational credentials, mobile number, and address) is accurate, current, and truthful. Submitting fraudulent or misleading details may lead to immediate disqualification.
                    </p>
                </section>

                {/* 11. Educational & Awareness Purpose */}
                <section id="educational-content" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        11. Educational & Awareness Purpose Disclaimer
                    </h2>
                    <p className="text-slate-700 text-sm">
                        All articles, guides, income illustrations, FAQs, and informational materials on BimaSakhi.com are provided strictly for general awareness and career orientation purposes. They do not constitute formal legal, financial, tax, or investment advice.
                    </p>
                </section>

                {/* 12. Misuse of Platform & System Integrity */}
                <section id="platform-misuse" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        12. Misuse of Platform & System Integrity
                    </h2>
                    <p className="text-slate-700 text-sm mb-3">
                        Users agree not to misuse BimaSakhi.com or engage in unauthorized activities:
                    </p>
                    <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-700">
                        <li>Submitting fake application details or impersonating other individuals.</li>
                        <li>Attempting automated data scraping, harvesting, or reverse engineering platform code.</li>
                        <li>Introducing computer viruses, trojans, bots, or malicious scripts.</li>
                        <li>Interfering with server performance, network firewalls, or website security features.</li>
                    </ul>
                </section>

                {/* 13. Automated Tools & AI Assistance Notice */}
                <section id="ai-notice" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        13. Automated Tools & AI Assistance Notice
                    </h2>
                    <p className="text-slate-700 text-sm">
                        BimaSakhi.com may utilize automated software tools, conversational assistants, or AI technology to provide instant candidate guidance, FAQ answers, or basic application pre-screening. AI-generated responses and automated interactions may be reviewed by human support staff where appropriate to ensure accuracy.
                    </p>
                </section>

                {/* 14. Communication Authorization & Opt-Out */}
                <section id="communication-consent" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        14. Communication Authorization & Consent Withdrawal
                    </h2>
                    <p className="text-slate-700 text-sm mb-3">
                        By submitting your application details on BimaSakhi.com, you authorize IMIAH Services to contact you regarding your application status, interview schedules, and recruitment updates via phone calls, SMS, email, or WhatsApp Business Platform.
                    </p>
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <strong>Opt-Out Rights:</strong> You may opt out of WhatsApp communications at any time by replying <strong>"STOP"</strong> in the chat, or request email communication stoppage by writing to <strong>support@bimasakhi.com</strong>.
                    </p>
                </section>

                {/* 15. Intellectual Property & Trademarks */}
                <section id="intellectual-property" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        15. Intellectual Property & Trademark Protection
                    </h2>
                    <p className="text-slate-700 text-sm mb-3">
                        All original text, website design, graphics, layout, and logos on BimaSakhi.com are the intellectual property of IMIAH Services unless otherwise stated.
                    </p>
                    <p className="text-xs text-slate-600">
                        <strong>LIC®</strong> and associated emblems are registered trademarks of Life Insurance Corporation of India. References to LIC on this platform are used solely for descriptive purposes under fair reference to inform eligible candidates about agency recruitment.
                    </p>
                </section>

                {/* 16. Website Availability & Maintenance */}
                <section id="website-availability" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        16. Website Availability & Scheduled Maintenance
                    </h2>
                    <p className="text-slate-700 text-sm">
                        While we strive to maintain high website availability, IMIAH Services does not guarantee uninterrupted, error-free, or continuous access to BimaSakhi.com. Access may be temporarily suspended without notice due to scheduled technical maintenance, system updates, server upgrades, or unforeseen network disruptions.
                    </p>
                </section>

                {/* 17. External Links & Governing Language */}
                <section id="third-party-links" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        17. External Links & Governing Language Notice
                    </h2>
                    <p className="text-slate-700 text-sm mb-3">
                        Our platform may contain links to external third-party portals (such as licindia.in). IMIAH Services has no control over third-party content or privacy practices and accepts no responsibility for external websites.
                    </p>
                    <p className="text-xs text-slate-600">
                        <strong>Governing Language:</strong> In the event that these Terms & Conditions are translated into other languages (such as Hindi), the official English version published on this page shall govern in case of any linguistic ambiguity or conflict.
                    </p>
                </section>

                {/* 18. Limitation of Liability */}
                <section id="limitation-liability" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        18. Limitation of Liability & Disclaimer
                    </h2>
                    <p className="text-slate-700 text-sm mb-3">
                        To the maximum extent permitted by applicable Indian law, IMIAH Services and its representatives shall not be liable for:
                    </p>
                    <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-700">
                        <li>Selection or rejection decisions taken by Life Insurance Corporation of India (LIC).</li>
                        <li>Changes in recruitment rules, exam schedules, or commission policies announced by LIC.</li>
                        <li>Any technical downtime, data loss, or indirect, incidental, or consequential damages arising from the use of this website.</li>
                    </ul>
                </section>

                {/* 19. Governing Law & Jurisdiction */}
                <section id="governing-law" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        19. Governing Law & Dispute Jurisdiction
                    </h2>
                    <p className="text-slate-700 text-sm">
                        These Terms & Conditions are governed by and construed in accordance with the laws of the Republic of India. Any legal disputes, claims, or proceedings arising out of or in connection with the use of BimaSakhi.com shall be subject to the exclusive jurisdiction of the competent courts located in <strong>New Delhi, India</strong>.
                    </p>
                </section>

                {/* 20. Revision of Terms & Notices */}
                <section id="terms-updates" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        20. Revision of Terms & Future Notices
                    </h2>
                    <p className="text-slate-700 text-sm">
                        IMIAH Services reserves the right to amend, update, or revise these Terms & Conditions at any time to reflect operational changes, statutory updates, or platform feature enhancements. Revised terms will be posted on this page with an updated "Last Updated" date. Continued use of BimaSakhi.com constitutes acceptance of the modified terms.
                    </p>
                </section>

                {/* 21. Official Support & Operating Contact */}
                <section id="contact-info" className="scroll-mt-20">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                        21. Official Support & Operating Contact Details
                    </h2>
                    <p className="text-slate-700 text-sm mb-4">
                        If you have questions, feedback, or legal inquiries regarding these Terms & Conditions, please contact our operating team:
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
                        <Link href="/privacy-policy" className="hover:underline">Privacy Policy</Link>
                        <span>•</span>
                        <Link href="/disclaimer" className="hover:underline">Disclaimer</Link>
                        <span>•</span>
                        <Link href="/contact" className="hover:underline">Contact Us</Link>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TermsContent;
