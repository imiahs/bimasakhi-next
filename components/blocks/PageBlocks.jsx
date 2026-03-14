import React from 'react';
import Link from 'next/link';
import SmartCTA from '@/components/ui/SmartCTA';

export const HeroBlock = ({ data }) => {
    return (
        <section className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white overflow-hidden py-24 md:py-32">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-500 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/3"></div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 text-center">
                <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
                    {data.headline || 'Become a Bima Sakhi Today'}
                </h1>
                <p className="text-lg md:text-xl text-indigo-100 max-w-3xl mx-auto mb-10 leading-relaxed font-light">
                    {data.subheadline || 'Join an elite network of women in insurance. Secure your financial independence without disrupting your lifestyle.'}
                </p>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                    <SmartCTA className="bg-white text-indigo-900 hover:bg-indigo-50 px-8 py-3.5 rounded-full font-bold shadow-lg transition transform hover:-translate-y-1" />
                    <Link href="/why" className="text-white hover:text-indigo-200 font-semibold px-6 py-3 transition">
                        Learn More →
                    </Link>
                </div>
            </div>
        </section>
    );
};

import DOMPurify from 'isomorphic-dompurify';

export const ContentBlock = ({ data }) => {
    const cleanHtml = DOMPurify.sanitize(data.html || '<p>Default Content Block... populate this via Admin Editor.</p>');

    return (
        <section className="py-16 bg-white">
            <div className="max-w-4xl mx-auto px-6 lg:px-8">
                <div className="prose prose-indigo md:prose-lg max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: cleanHtml }} />
            </div>
        </section>
    );
};

export const BenefitsBlock = ({ data }) => {
    return (
        <section className="py-20 bg-slate-50">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-slate-900">Why Join Bima Sakhi?</h2>
                    <p className="text-slate-600 mt-2">Empowering women across India with financial independence.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    {['Zero Investment', 'Flexible Timing', 'Unlimited Earnings'].map((b, i) => (
                        <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-100 hover:shadow-md transition">
                            <span className="text-4xl block mb-4">✨</span>
                            <h3 className="font-bold text-xl text-slate-800 mb-2">{b}</h3>
                            <p className="text-slate-600">Secure a stable income dynamically integrated around your schedule.</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export const TestimonialBlock = ({ data }) => {
    return (
        <section className="py-20 bg-indigo-900 text-white">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
                <h2 className="text-3xl font-bold mb-12">Success Stories</h2>
                <div className="max-w-3xl mx-auto italic text-xl md:text-2xl font-light text-indigo-100">
                    "{data.quote || 'This platform completely changed my earning capability while allowing me to manage my home.'}"
                </div>
                <div className="mt-8 font-bold text-white">— {data.author || 'Priya Sharma, Elite Agent'}</div>
            </div>
        </section>
    );
};

export const CTABlock = ({ data }) => {
    return (
        <section className="py-16 bg-purple-600 text-center text-white px-6">
            <h2 className="text-3xl font-bold mb-6">{data.label || 'Ready to start your journey?'}</h2>
            <Link href={data.href || '/apply'} className="inline-block bg-white text-purple-700 font-bold px-8 py-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition">
                {data.buttonText || 'Apply Now'}
            </Link>
        </section>
    );
};

export const FAQBlock = ({ data }) => {
    return (
        <section className="py-20 bg-white">
            <div className="max-w-3xl mx-auto px-6">
                <h2 className="text-3xl font-bold text-center text-slate-900 mb-10">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    {['Dynamic FAQs loaded structurally...'].map((q, i) => (
                        <div key={i} className="border border-slate-200 p-5 rounded-lg">
                            <h3 className="font-bold text-slate-800">Is this really zero investment?</h3>
                            <p className="text-slate-600 mt-2">Yes, the Bima Sakhi program strictly requires zero upfront monetary investment to join.</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// Map components requiring complex inner routes separately or render placeholders if imported contextually
import CalculatorIndex from '@/app/tools/ToolsIndex';

export const CalculatorBlock = ({ data }) => {
    return (
        <section className="py-10 bg-slate-50">
            <div className="max-w-5xl mx-auto px-6">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-slate-900">Income Potential</h2>
                    <p className="text-slate-600 mt-2">Calculate your expected returns dynamically.</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <CalculatorIndex />
                </div>
            </div>
        </section>
    );
};

export const DownloadBlock = ({ data }) => {
    return (
        <section className="py-16 bg-indigo-50 border-y border-indigo-100">
            <div className="max-w-4xl mx-auto px-6 text-center">
                <span className="text-4xl block mb-4">📥</span>
                <h2 className="text-2xl font-bold text-indigo-900 mb-2">Exclusive Resources</h2>
                <p className="text-indigo-700 mb-6">Gain access to top-tier agent methodologies securely.</p>
                <Link href="/resources" className="inline-block bg-indigo-600 text-white font-bold px-6 py-3 rounded shadow hover:bg-indigo-700 transition">
                    Browse Downloads
                </Link>
            </div>
        </section>
    );
};
