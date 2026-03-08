import BlogArticle from './BlogArticle';
import { blogPosts } from '@/data/blogPosts';
import Script from 'next/script';

export function generateStaticParams() {
    return blogPosts.map((post) => ({
        slug: post.slug,
    }));
}

export async function generateMetadata({ params }) {
    const resolvedParams = await params;
    const post = blogPosts.find((p) => p.slug === resolvedParams.slug);

    if (!post) {
        return {
            title: 'Article Not Found',
        };
    }

    return {
        title: `${post.title} | Bima Sakhi`,
        description: post.description,
        alternates: {
            canonical: `https://bimasakhi.com/blog/${post.slug}`,
        },
        openGraph: {
            title: post.title,
            description: post.description,
            url: `https://bimasakhi.com/blog/${post.slug}`,
            images: [
                {
                    url: post.image,
                    width: 1200,
                    height: 630,
                    alt: post.title,
                },
            ],
            type: 'article',
            publishedTime: post.date,
            authors: [post.author],
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description: post.description,
            images: [post.image],
        },
    };
}

export default async function BlogPostPage({ params }) {
    const resolvedParams = await params;
    const post = blogPosts.find((p) => p.slug === resolvedParams.slug);

    if (!post) {
        return <div className="container py-8 text-center"><h1>Article not found</h1></div>;
    }

    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.description,
        image: `https://bimasakhi.com${post.image}`,
        datePublished: post.date,
        author: {
            '@type': 'Person',
            name: post.author,
        },
        publisher: {
            '@type': 'Organization',
            name: 'Bima Sakhi',
            logo: {
                '@type': 'ImageObject',
                url: 'https://bimasakhi.com/images/home/logo.png',
            },
        },
    };

    const breadcrumbData = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {
                '@type': 'ListItem',
                'position': 1,
                'name': 'Home',
                'item': 'https://bimasakhi.com/'
            },
            {
                '@type': 'ListItem',
                'position': 2,
                'name': 'Blog',
                'item': 'https://bimasakhi.com/blog'
            },
            {
                '@type': 'ListItem',
                'position': 3,
                'name': post.category,
                'item': `https://bimasakhi.com/blog?category=${post.category}`
            },
            {
                '@type': 'ListItem',
                'position': 4,
                'name': post.title,
                'item': `https://bimasakhi.com/blog/${post.slug}`
            }
        ]
    };

    return (
        <>
            <Script
                id={`schema-${post.slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
            />
            <Script
                id={`breadcrumb-${post.slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
            />
            <BlogArticle post={post} />
        </>
    );
}
