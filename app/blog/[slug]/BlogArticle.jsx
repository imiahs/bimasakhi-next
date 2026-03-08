'use client';

import Link from 'next/link';
import { useRef, useEffect } from 'react';
import { blogPosts } from '@/data/blogPosts';
import ReadingProgressBar from '@/components/blog/ReadingProgressBar';
import TableOfContents from '@/components/blog/TableOfContents';
import BlogSidebar from '@/components/blog/BlogSidebar';
import Button from '@/components/ui/Button';
import '@/styles/Blog.css';

const BlogArticle = ({ post }) => {
    const articleRef = useRef(null);
    // Get up to 5 recent posts for the sidebar (excluding current)
    const recentPosts = blogPosts.filter(p => p.slug !== post.slug).slice(0, 5);

    // Task 6: Blog Engagement Tracking
    useEffect(() => {
        let tracked25 = false;
        let tracked50 = false;
        let tracked75 = false;
        let tracked100 = false;

        const handleScroll = () => {
            const scrollPosition = window.scrollY + window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollPercent = (scrollPosition / documentHeight) * 100;

            const trackEvent = (threshold) => {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                    event: `article_read_${threshold}`,
                    article_title: post.title,
                    article_category: post.category
                });
            };

            if (scrollPercent >= 25 && !tracked25) {
                tracked25 = true;
                trackEvent(25);
            }
            if (scrollPercent >= 50 && !tracked50) {
                tracked50 = true;
                trackEvent(50);
            }
            if (scrollPercent >= 75 && !tracked75) {
                tracked75 = true;
                trackEvent(75);
            }
            if (scrollPercent >= 95 && !tracked100) { // 95% covers natural footer stops
                tracked100 = true;
                trackEvent(100);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [post.title, post.category]);

    return (
        <article className="blog-article-container">
            <ReadingProgressBar />

            <header className="article-hero">
                <div className="container">
                    <div className="breadcrumb">
                        <Link href="/">Home</Link> / <Link href="/blog">Blog</Link> / <span>{post.category}</span>
                    </div>
                    <h1>{post.title}</h1>
                    <div className="article-meta">
                        <span>By <strong>{post.author}</strong></span>
                        <span>Published on <strong>{post.date}</strong></span>
                    </div>
                </div>
            </header>

            <div className="container blog-layout-wrapper">
                {/* Left Column: Article Content */}
                <main className="article-main">
                    <div className="article-image-container">
                        <img src={post.image} alt={post.title} />
                    </div>

                    <TableOfContents contentRef={articleRef} />

                    <div className="article-body" ref={articleRef} dangerouslySetInnerHTML={{ __html: post.content }} />

                    {/* Blog Exit CTA */}
                    <div className="blog-exit-cta" style={{ marginTop: '40px', padding: '30px', backgroundColor: '#f0f4ff', borderRadius: '12px', border: '1px solid #d6e4ff', textAlign: 'center' }}>
                        <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px', color: '#1e3a8a' }}>Ready to Start Your Journey?</h3>
                        <p style={{ marginBottom: '24px', color: '#475569' }}>Apply for the LIC Bima Sakhi program today or download our free study materials.</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <Link href="/apply">
                                <Button variant="primary">Apply Now →</Button>
                            </Link>
                            <Link href="/resources">
                                <Button variant="outline">View Free Resources</Button>
                            </Link>
                        </div>
                    </div>
                </main>

                {/* Right Column: Sidebar */}
                <BlogSidebar recentPosts={recentPosts} />
            </div>

            {/* Related Articles Section (Bottom) */}
            {
                recentPosts.length > 0 && (
                    <section className="related-articles">
                        <div className="container">
                            <h2>More from Bima Sakhi</h2>
                            <div className="blog-grid">
                                {recentPosts.slice(0, 3).map((relatedPost) => (
                                    <div className="blog-card" key={relatedPost.slug}>
                                        <div className="blog-card-image">
                                            <img src={relatedPost.image} alt={relatedPost.title} />
                                        </div>
                                        <div className="blog-card-content">
                                            <div className="blog-meta">
                                                <span className="blog-category">{relatedPost.category}</span>
                                                <span className="blog-date">{relatedPost.date}</span>
                                            </div>
                                            <h3>{relatedPost.title}</h3>
                                            <p>{relatedPost.description}</p>
                                            <Link href={`/blog/${relatedPost.slug}`} className="read-more">
                                                Read Article →
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )
            }
        </article >
    );
};

export default BlogArticle;
