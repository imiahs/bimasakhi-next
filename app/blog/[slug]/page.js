import BlogArticle from './BlogArticle';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import Script from 'next/script';
import { cache } from 'react';

// Revalidate cache every hour (ISR)
export const revalidate = 3600;

const getBlogData = cache(async (slug) => {
    const supabase = getServiceSupabase();
    return await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();
});

export async function generateStaticParams() {
    const supabase = getServiceSupabase();
    const { data: posts } = await supabase.from('blog_posts').select('slug').eq('status', 'published');

    return (posts || []).map((post) => ({
        slug: post.slug,
    }));
}

export async function generateMetadata({ params }) {
    const resolvedParams = await params;
    const { data: post } = await getBlogData(resolvedParams.slug);

    if (!post) {
        return {
            title: 'Article Not Found',
        };
    }

    return {
        title: `${post.meta_title || post.title} | Bima Sakhi`,
        description: post.meta_description,
        alternates: {
            canonical: `https://bimasakhi.com/blog/${post.slug}`,
        },
        openGraph: {
            title: post.meta_title || post.title,
            description: post.meta_description,
            url: `https://bimasakhi.com/blog/${post.slug}`,
            images: [
                {
                    url: '/images/home/hero-bg.jpg', // Default until featured image column added
                    width: 1200,
                    height: 630,
                    alt: post.title,
                },
            ],
            type: 'article',
            publishedTime: post.created_at,
            authors: [post.author],
        },
        twitter: {
            card: 'summary_large_image',
            title: post.meta_title || post.title,
            description: post.meta_description,
            images: ['/images/home/hero-bg.jpg'],
        },
    };
}

export default async function BlogPostPage({ params }) {
    const resolvedParams = await params;
    const { data: post } = await getBlogData(resolvedParams.slug);

    if (!post) {
        return <div className="container py-8 text-center"><h1>Article not found</h1></div>;
    }

    const supabase = getServiceSupabase();

    // Attempt to increment views silently internally
    try {
        await supabase
            .from('blog_posts')
            .update({ views: (post.views || 0) + 1 })
            .eq('id', post.id);
    } catch (e) {
        console.error("Runtime Error:", e);
    }

    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.meta_description,
        image: `https://bimasakhi.com/images/home/hero-bg.jpg`,
        datePublished: post.created_at,
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
                'name': 'Articles',
                'item': `https://bimasakhi.com/blog`
            },
            {
                '@type': 'ListItem',
                'position': 4,
                'name': post.title,
                'item': `https://bimasakhi.com/blog/${post.slug}`
            }
        ]
    };

    // Fetch recent posts for sidebar
    const { data: recentPostsData } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .neq('slug', resolvedParams.slug)
        .order('created_at', { ascending: false })
        .limit(5);

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
            <BlogArticle post={post} recentPosts={recentPostsData || []} />
        </>
    );
}
