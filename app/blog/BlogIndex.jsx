'use client';

import Link from 'next/link';
import { useState } from 'react';
import { blogPosts } from '@/data/blogPosts';
import BlogPagination from '@/components/blog/BlogPagination';
import '@/styles/Blog.css';

const BlogIndex = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const postsPerPage = 6;

    // Get current posts
    const indexOfLastPost = currentPage * postsPerPage;
    const indexOfFirstPost = indexOfLastPost - postsPerPage;
    const currentPosts = blogPosts.slice(indexOfFirstPost, indexOfLastPost);

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
                                <img src={post.image} alt={post.title} />
                            </div>
                            <div className="blog-card-content">
                                <div className="blog-meta">
                                    <span className="blog-category">{post.category}</span>
                                    <span className="blog-date">{post.date}</span>
                                </div>
                                <h3>{post.title}</h3>
                                <p>{post.description}</p>
                                <Link href={`/blog/${post.slug}`} className="read-more">
                                    Read Article →
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                <BlogPagination
                    postsPerPage={postsPerPage}
                    totalPosts={blogPosts.length}
                    currentPage={currentPage}
                    paginate={paginate}
                />
            </section>
        </div>
    );
};

export default BlogIndex;
