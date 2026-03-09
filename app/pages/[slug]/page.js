import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import * as Blocks from '@/components/blocks/PageBlocks';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import FloatingApply from '@/components/ui/FloatingApply';
import FloatingWhatsApp from '@/components/ui/FloatingWhatsApp';
import PageTracker from '@/components/ui/PageTracker';

export const revalidate = 60;

// Fetch Page Data function
async function getPageData(slug, previewToken) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
        return null;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch page bypassing published strictly, check below
    const { data: maybePage } = await supabase.from('custom_pages').select('*').eq('slug', slug).maybeSingle();

    if (!maybePage) return null;

    if (maybePage.status !== 'published') {
        if (!previewToken || previewToken !== `bimasakhi_admin_${maybePage.id}`) {
            return null; // Not published and invalid preview token
        }
    }

    const page = maybePage;

    const { data: blocks } = await supabase.from('page_blocks').select('*').eq('page_id', page.id).order('block_order', { ascending: true });

    return { page, blocks: blocks || [] };
}

export async function generateMetadata({ params, searchParams }) {
    const { slug } = await params;
    const resolvedSearchParams = await searchParams;
    const data = await getPageData(slug, resolvedSearchParams?.preview_token);

    if (!data) return { title: 'Page Not Found | Bima Sakhi' };

    return {
        title: data.page.meta_title || `${data.page.title} | Bima Sakhi`,
        description: data.page.meta_description || 'Empowering women via insurance networks.',
    };
}

export default async function DynamicCMSPage({ params, searchParams }) {
    const { slug } = await params;
    const resolvedSearchParams = await searchParams;
    const data = await getPageData(slug, resolvedSearchParams?.preview_token);

    if (!data) {
        notFound();
    }

    const { blocks } = data;

    // Async block parsing map into React nodes Server-side
    const renderBlocks = () => {
        return blocks.map((block) => {
            const ComponentRender = Blocks[block.block_type];
            if (!ComponentRender) {
                console.warn(`Block type requested [${block.block_type}] does not exist in library.`);
                return null;
            }
            return <ComponentRender key={block.id} data={block.block_data} />;
        });
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow pt-24 bg-slate-50">
                {blocks.length > 0 ? (
                    renderBlocks()
                ) : (
                    <div className="text-center py-32 text-slate-500">
                        Content is currently being assembled for this route.
                    </div>
                )}
            </main>
            <Footer />
            <FloatingApply />
            <FloatingWhatsApp />
            <PageTracker pageId={data.page.id} />
        </div>
    );
}
