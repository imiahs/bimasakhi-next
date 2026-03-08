import BlogIndex from './BlogIndex';
import { getServiceSupabase } from '@/utils/supabase';

// Revalidate cache every hour (ISR)
export const revalidate = 3600;

export const metadata = {
    title: 'LIC Bima Sakhi Blog | Guides & Updates',
    description: 'Read the latest guides, tips, and updates on becoming an LIC agent and building a successful career with Bima Sakhi.',
};

export default async function BlogPage() {
    const supabase = getServiceSupabase();

    const { data: posts } = await supabase
        .from('blog_posts')
        .select('title, slug, meta_description, author, created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

    return <BlogIndex initialPosts={posts || []} />;
}
