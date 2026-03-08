'use client';

import Link from 'next/link';
import { useState } from 'react';
import BlogPagination from '@/components/blog/BlogPagination';
import '@/styles/Blog.css';

const BlogIndex = ({ initialPosts = [] }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const postsPerPage = 6;

    // Get current posts
    const indexOfLastPost = currentPage * postsPerPage;
    const indexOfFirstPost = indexOfLastPost - postsPerPage;
    const currentPosts = initialPosts.slice(indexOfFirstPost, indexOfLastPost);

    // Change page
    const paginate = (pageNumber) => setCurrentPage(pageNumber);
    return (
        <div className="blog-container">
            <section className="blog-hero">
                <div className="container">
                    <h1>Bima Sakhi Blog & Resources</h1>
                    <p className="subtitle">Expert guides, agency tips, and success stories to help you build a thriving career with LIC.</p>
                </div>
            </section>

            <section className="blog-list-container container">
                <div className="blog-grid">
                    {currentPosts.map((post) => (
                        <div className="blog-card" key={post.slug}>
                            <div className="blog-card-image">
                                {/* Fallback Placeholder since we didn't require featured images in schema yet */}
                                <div style={{ width: '100%', height: '100%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>📝</div>
                            </div>
                            <div className="blog-card-content">
                                <div className="blog-meta">
                                    <span className="blog-category">{post.author || 'Admin'}</span>
                                    <span className="blog-date">{new Date(post.created_at).toLocaleDateString()}</span>
                                </div>
                                <h3>{post.title}</h3>
                                <p>{post.meta_description}</p>
                                <Link href={`/blog/${post.slug}`} className="read-more">
                                    Read Article →
                                </Link>
                            </div>
                        </div>
                    ))}
                    {initialPosts.length === 0 && <p style={{ textAlign: 'center', gridColumn: '1 / -1' }}>More articles coming soon!</p>}
                </div>

                {initialPosts.length > postsPerPage && (
                    <BlogPagination
                        postsPerPage={postsPerPage}
                        totalPosts={initialPosts.length}
                        currentPage={currentPage}
                        paginate={paginate}
                    />
                )}
            </section>
        </div>
    );
};

export default BlogIndex;
