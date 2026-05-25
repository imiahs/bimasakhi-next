import React from 'react';
import Link from 'next/link';
import SmartCTA from '@/components/ui/SmartCTA';
import CalculatorIndex from '@/app/tools/ToolsIndex';
import { normalizeBlockData } from '@/lib/blocks/registry';

function resolveBlockData(blockType, data, normalizedData) {
    return normalizedData || normalizeBlockData(blockType, data);
}

function BlockActionButton({ label, href, mode = 'static', className, eventLabel }) {
    const finalLabel = String(label || '').trim();
    if (!finalLabel) return null;

    if (mode === 'smart') {
        return (
            <SmartCTA
                defaultLabel={finalLabel}
                defaultLink={href || '/apply'}
                className={className}
                eventLabel={eventLabel || 'page_block_smart_cta'}
            />
        );
    }

    return (
        <Link href={href || '/apply'} className={className}>
            {finalLabel}
        </Link>
    );
}

function BlockMediaFigure({ src, alt, caption, className = '', imageClassName = '', placeholder = 'MEDIA', loading = 'lazy', fetchPriority = 'auto' }) {
    if (!src) {
        return (
            <div className={`flex min-h-64 items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/5 text-xs font-semibold uppercase tracking-[0.4em] text-slate-300 ${className}`.trim()}>
                {placeholder}
            </div>
        );
    }

    return (
        <figure className={className}>
            <img src={src} alt={alt || ''} className={imageClassName} loading={loading} decoding="async" fetchPriority={fetchPriority} />
            {caption ? <figcaption className="mt-3 text-sm text-slate-500">{caption}</figcaption> : null}
        </figure>
    );
}

export const HeroBlock = ({ data, normalizedData }) => {
    const content = resolveBlockData('HeroBlock', data, normalizedData);

    return (
        <section className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white overflow-hidden py-24 md:py-32">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_34%),radial-gradient(circle_at_80%_10%,_rgba(255,255,255,0.12),_transparent_26%),linear-gradient(135deg,_rgba(255,255,255,0.06),_transparent_55%)] opacity-50 mix-blend-overlay"></div>
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-500 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/3"></div>

            <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:px-8">
                <div className="text-center lg:text-left">
                    {content.eyebrow ? <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-indigo-200">{content.eyebrow}</p> : null}
                    <h1 className="mb-6 text-4xl font-black tracking-tight md:text-6xl">
                        {content.headline}
                    </h1>
                    <p className="mb-10 max-w-3xl text-lg font-light leading-relaxed text-indigo-100 md:text-xl">
                        {content.subheadline}
                    </p>
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
                        <BlockActionButton
                            label={content.primaryCtaLabel}
                            href={content.primaryCtaHref}
                            mode={content.ctaMode}
                            className="inline-block rounded-full bg-white px-8 py-3.5 font-bold text-indigo-900 shadow-lg transition hover:bg-indigo-50"
                            eventLabel="page_block_hero_primary"
                        />
                        <BlockActionButton
                            label={content.secondaryCtaLabel}
                            href={content.secondaryCtaHref}
                            className="inline-block px-6 py-3 font-semibold text-white transition hover:text-indigo-200"
                            eventLabel="page_block_hero_secondary"
                        />
                    </div>
                </div>
                <BlockMediaFigure
                    src={content.mediaSrc}
                    alt={content.mediaAlt}
                    className="self-center"
                    imageClassName="aspect-[4/3] w-full rounded-[2rem] border border-white/10 object-cover shadow-2xl"
                    placeholder="HERO"
                    loading="eager"
                    fetchPriority="high"
                />
            </div>
        </section>
    );
};

export const ContentBlock = ({ data, normalizedData }) => {
    const content = resolveBlockData('ContentBlock', data, normalizedData);

    return (
        <section className="py-16 bg-white">
            <div className="max-w-4xl mx-auto px-6 lg:px-8">
                {content.heading ? <h2 className="mb-6 text-3xl font-bold text-slate-900">{content.heading}</h2> : null}
                <div className="prose prose-indigo md:prose-lg max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: content.html }} />
            </div>
        </section>
    );
};

export const BenefitsBlock = ({ data, normalizedData }) => {
    const content = resolveBlockData('BenefitsBlock', data, normalizedData);

    return (
        <section className="py-20 bg-slate-50">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-slate-900">{content.title}</h2>
                    <p className="text-slate-600 mt-2">{content.subtitle}</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    {content.items.map((item) => (
                        <div key={`${item.title}-${item.icon}`} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-100 hover:shadow-md transition">
                            <span className="mb-4 block font-mono text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500">{item.icon}</span>
                            <h3 className="font-bold text-xl text-slate-800 mb-2">{item.title}</h3>
                            <p className="text-slate-600">{item.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export const AuthorityBlock = ({ data, normalizedData }) => {
    const content = resolveBlockData('AuthorityBlock', data, normalizedData);

    return (
        <section className="bg-white py-16">
            <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)] lg:px-8">
                <div>
                    {content.eyebrow ? <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500">{content.eyebrow}</p> : null}
                    <h2 className="mb-4 text-3xl font-bold text-slate-900">{content.title}</h2>
                    <p className="text-lg leading-8 text-slate-600">{content.body}</p>
                </div>
                <div className="grid gap-4">
                    {content.highlights.map((item) => (
                        <div key={item.text} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-700">
                            {item.text}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export const TestimonialBlock = ({ data, normalizedData }) => {
    const content = resolveBlockData('TestimonialBlock', data, normalizedData);

    return (
        <section className="py-20 bg-indigo-900 text-white">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
                <h2 className="text-3xl font-bold mb-12">{content.title}</h2>
                <div className="max-w-3xl mx-auto italic text-xl md:text-2xl font-light text-indigo-100">
                    "{content.quote}"
                </div>
                <div className="mt-8 font-bold text-white">- {content.author}</div>
                {content.role ? <div className="mt-2 text-sm uppercase tracking-[0.3em] text-indigo-200">{content.role}</div> : null}
            </div>
        </section>
    );
};

export const CTABlock = ({ data, normalizedData }) => {
    const content = resolveBlockData('CTABlock', data, normalizedData);

    return (
        <section className="py-16 bg-purple-600 text-center text-white px-6">
            <h2 className="text-3xl font-bold mb-4">{content.label}</h2>
            {content.description ? <p className="mx-auto mb-8 max-w-2xl text-purple-100">{content.description}</p> : null}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <BlockActionButton
                    label={content.primaryCtaLabel}
                    href={content.primaryCtaHref}
                    mode={content.ctaMode}
                    className="inline-block rounded-full bg-white px-8 py-4 font-bold text-purple-700 shadow-lg transition hover:shadow-xl"
                    eventLabel="page_block_cta_primary"
                />
                <BlockActionButton
                    label={content.secondaryCtaLabel}
                    href={content.secondaryCtaHref}
                    className="inline-block rounded-full border border-white/30 px-8 py-4 font-semibold text-white transition hover:bg-white/10"
                    eventLabel="page_block_cta_secondary"
                />
            </div>
        </section>
    );
};

export const FAQBlock = ({ data, normalizedData }) => {
    const content = resolveBlockData('FAQBlock', data, normalizedData);

    return (
        <section className="py-20 bg-white">
            <div className="max-w-3xl mx-auto px-6">
                <h2 className="text-3xl font-bold text-center text-slate-900 mb-10">{content.title}</h2>
                <div className="space-y-4">
                    {content.items.map((item) => (
                        <div key={item.question} className="border border-slate-200 p-5 rounded-lg">
                            <h3 className="font-bold text-slate-800">{item.question}</h3>
                            <p className="text-slate-600 mt-2">{item.answer}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export const CalculatorBlock = ({ data, normalizedData }) => {
    const content = resolveBlockData('CalculatorBlock', data, normalizedData);

    return (
        <section className="py-10 bg-slate-50">
            <div className="max-w-5xl mx-auto px-6">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-slate-900">{content.title}</h2>
                    <p className="text-slate-600 mt-2">{content.subtitle}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <CalculatorIndex />
                </div>
            </div>
        </section>
    );
};

export const DownloadBlock = ({ data, normalizedData }) => {
    const content = resolveBlockData('DownloadBlock', data, normalizedData);

    return (
        <section className="py-16 bg-indigo-50 border-y border-indigo-100">
            <div className="max-w-4xl mx-auto px-6 text-center">
                <span className="text-sm font-semibold uppercase tracking-[0.4em] text-indigo-500">DL</span>
                <h2 className="text-2xl font-bold text-indigo-900 mb-2 mt-4">{content.title}</h2>
                <p className="text-indigo-700 mb-6">{content.description}</p>
                <BlockActionButton
                    label={content.primaryCtaLabel}
                    href={content.primaryCtaHref}
                    className="inline-block bg-indigo-600 text-white font-bold px-6 py-3 rounded shadow hover:bg-indigo-700 transition"
                    eventLabel="page_block_download_primary"
                />
            </div>
        </section>
    );
};

export const MediaBlock = ({ data, normalizedData }) => {
    const content = resolveBlockData('MediaBlock', data, normalizedData);

    return (
        <section className="bg-white py-16">
            <div className="mx-auto max-w-5xl px-6 lg:px-8">
                {content.eyebrow ? <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500">{content.eyebrow}</p> : null}
                <h2 className="mb-4 text-3xl font-bold text-slate-900">{content.title}</h2>
                <p className="mb-8 max-w-3xl text-lg text-slate-600">{content.description}</p>
                <BlockMediaFigure
                    src={content.mediaSrc}
                    alt={content.mediaAlt}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    imageClassName="aspect-[16/9] w-full rounded-2xl object-cover"
                    placeholder="MEDIA"
                />
                <div className="mt-8">
                    <BlockActionButton
                        label={content.primaryCtaLabel}
                        href={content.primaryCtaHref}
                        className="inline-block rounded-full bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700"
                        eventLabel="page_block_media_primary"
                    />
                </div>
            </div>
        </section>
    );
};
