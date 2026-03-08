'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';

const BlogSidebar = ({ recentPosts }) => {
    const categories = [
        { name: 'Income', path: '/blog?category=Income' },
        { name: 'Career Guide', path: '/blog?category=Career' },
        { name: 'Eligibility', path: '/blog?category=Eligibility' }
    ];

    const importantLinks = [
        { name: 'Why Join LIC', path: '/why' },
        { name: 'Income Structure', path: '/income' },
        { name: 'Eligibility Check', path: '/eligibility' },
        { name: 'Apply Now', path: '/apply' },
        { name: 'IC-38 Study Materials', path: '/downloads' }
    ];

    return (
        <aside className="blog-sidebar">

            {/* 1. Recent Articles */}
            <div className="sidebar-widget">
                <h3 className="widget-title">Recent Articles</h3>
                <ul className="widget-list recent-posts-list">
                    {recentPosts.map((post) => (
                        <li key={post.slug}>
                            <Link href={`/blog/${post.slug}`} className="recent-post-link">
                                {post.title}
                            </Link>
                            <span className="recent-post-date">{post.date}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* 2. Categories */}
            <div className="sidebar-widget">
                <h3 className="widget-title">Categories</h3>
                <ul className="widget-list category-list">
                    {categories.map((cat, idx) => (
                        <li key={idx}>
                            <Link href="/blog" className="category-link">
                                {cat.name}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>

            {/* 3. Important Pages */}
            <div className="sidebar-widget">
                <h3 className="widget-title">Important Links</h3>
                <ul className="widget-list important-links-list">
                    {importantLinks.map((link, idx) => (
                        <li key={idx}>
                            <Link href={link.path} className="important-nav-link">
                                {link.name}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>

            {/* 4. Sticky Apply CTA */}
            <div className="sidebar-widget sticky-widget join-cta-widget">
                <h3 className="cta-widget-title">Become LIC Bima Sakhi</h3>
                <p>Start your LIC career today. Zero investment, flexible hours, massive income potential.</p>
                <Link href="/apply">
                    <Button variant="primary" className="w-full mt-4 shadow-md">
                        Apply Now
                    </Button>
                </Link>
            </div>

        </aside>
    );
};

export default BlogSidebar;
