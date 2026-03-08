import { blogPosts } from '@/data/blogPosts';

export default function sitemap() {
    const baseUrl = 'https://bimasakhi.com';
    const lastModified = new Date().toISOString();

    const staticPages = [
        {
            url: baseUrl,
            lastModified,
            changeFrequency: 'weekly',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/why`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/income`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/eligibility`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/apply`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/blog`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/contact`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/downloads`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/about`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${baseUrl}/bima-sakhi-delhi`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
    ];

    const blogPages = blogPosts.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.date).toISOString(),
        changeFrequency: 'monthly',
        priority: 0.7,
    }));

    return [...staticPages, ...blogPages];
}
