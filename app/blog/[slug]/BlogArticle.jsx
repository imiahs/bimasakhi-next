'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { blogPosts } from '@/data/blogPosts';
import ReadingProgressBar from '@/components/blog/ReadingProgressBar';
import TableOfContents from '@/components/blog/TableOfContents';
import BlogSidebar from '@/components/blog/BlogSidebar';
import '@/styles/Blog.css';

const BlogArticle = ({ post }) => {
    const articleRef = useRef(null);
    // Get up to 5 recent posts for the sidebar (excluding current)
    const recentPosts = blogPosts.filter(p => p.slug !== post.slug).slice(0, 5);

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
