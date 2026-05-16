import ContentInventoryContent from '@/features/admin/content/ContentInventoryContent';

export const metadata = {
    title: 'Blog CMS | Bima Sakhi Admin',
    description: 'Manage articles, drafts, and rich-text content for the publication layer.',
};

export default function BlogPage() {
    return <ContentInventoryContent forcedType="blog" />;
}
