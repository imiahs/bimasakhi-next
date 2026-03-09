import dynamic from 'next/dynamic';

const BlogContent = dynamic(() => import('@/features/admin/blog/BlogContent'), {
    loading: () => <div className="p-8 text-center text-slate-500 animate-pulse">Loading CMS Modules...</div>,
});

export const metadata = {
    title: 'Blog CMS | Bima Sakhi Admin',
    description: 'Manage articles, drafts, and rich-text content for the publication layer.',
};

export default function BlogPage() {
    return <BlogContent />;
}
