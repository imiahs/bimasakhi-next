'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * GeneratedPageTemplate — Renders AI-generated pages from location_content table.
 * 
 * WHY this exists: Pagegen worker writes to page_index + location_content tables,
 * but no frontend component was reading from them. This template closes that 
 * "rendering gap" (Section 3 of CONTENT_COMMAND_CENTER.md).
 * 
 * NOTE: Navbar + Footer are NOT rendered here — root layout.js already provides them.
 */

function FAQAccordion({ faqData }) {
  const [openIndex, setOpenIndex] = useState(null);

  if (!Array.isArray(faqData) || faqData.length === 0) return null;

  return (
    <section className="gen-faq-section">
      <h2 className="gen-faq-title">Frequently Asked Questions</h2>
      <div className="gen-faq-list">
        {faqData.map((faq, index) => {
          const question = faq.question || faq.name || '';
          const answer = faq.answer || faq.acceptedAnswer?.text || faq.text || '';
          if (!question || !answer) return null;

          const isOpen = openIndex === index;

          return (
            <div key={index} className={`gen-faq-item ${isOpen ? 'gen-faq-open' : ''}`}>
              <button
                className="gen-faq-question"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
              >
                <span>{question}</span>
                <span className="gen-faq-icon">{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && (
                <div className="gen-faq-answer">
                  <p>{answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Breadcrumb({ slug }) {
  const parts = slug.split('/').filter(Boolean);

  const crumbs = [{ label: 'Home', href: '/' }];

  // Build breadcrumb from slug segments
  let accumulated = '';
  for (const part of parts) {
    accumulated += `/${part}`;
    const label = part
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({ label, href: accumulated });
  }

  return (
    <nav className="gen-breadcrumb" aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => (
        <span key={i}>
          {i > 0 && <span className="gen-breadcrumb-sep"> › </span>}
          {i === crumbs.length - 1 ? (
            <span className="gen-breadcrumb-current">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="gen-breadcrumb-link">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

function SiblingLinks({ siblings }) {
  if (!Array.isArray(siblings) || siblings.length === 0) return null;

  return (
    <section className="gen-siblings-section">
      <h3 className="gen-siblings-title">Also Explore</h3>
      <ul className="gen-siblings-list">
        {siblings.map((sib) => (
          <li key={sib.page_slug}>
            <Link href={`/${sib.page_slug}`} className="gen-siblings-link">
              {sib.page_slug
                .replace(/-/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function GeneratedPageTemplate({ page, content, siblings }) {
  const heroHeadline = content?.hero_headline || 'Bima Sakhi';
  const bodyHtml = content?.local_opportunity_description || '';
  const ctaText = content?.cta_text || 'Apply Now';
  const faqData = content?.faq_data || [];

  return (
    <article className="gen-page">
      {/* Hero Section */}
      <header className="gen-hero">
        <div className="gen-hero-inner">
          <Breadcrumb slug={page.page_slug} />
          <h1 className="gen-hero-headline">{heroHeadline}</h1>
        </div>
      </header>

      {/* Main Content + Sidebar */}
      <div className="gen-content-wrapper">
        {/* Main Content — 70% */}
        <div className="gen-main-content">
          {/* AI-generated body content */}
          <div
            className="gen-body-content"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />

          {/* FAQ Accordion */}
          <FAQAccordion faqData={faqData} />

          {/* Sibling Pages */}
          <SiblingLinks siblings={siblings} />
        </div>

        {/* Sidebar — 30% */}
        <aside className="gen-sidebar">
          <div className="gen-cta-card">
            <h3 className="gen-cta-heading">Interested?</h3>
            <p className="gen-cta-subtext">
              Take the first step toward financial independence with Bima Sakhi.
            </p>
            <Link href="/apply" className="gen-cta-button">
              {ctaText}
            </Link>
          </div>
        </aside>
      </div>

      {/* Bottom CTA Banner */}
      <section className="gen-bottom-cta">
        <div className="gen-bottom-cta-inner">
          <p className="gen-bottom-cta-text">
            Ready to start your journey?
          </p>
          <Link href="/apply" className="gen-cta-button">
            {ctaText}
          </Link>
        </div>
      </section>
    </article>
  );
}
