import ResourcesIndex from './ResourcesIndex';
import Script from 'next/script';
import { getServiceSupabase } from '@/utils/supabase';

// Revalidate cache every hour (ISR)
export const revalidate = 3600;

export const metadata = {
    title: 'Free LIC Agent Study Material & Resources | Bima Sakhi',
    description: 'Download free LIC agent resources including the IC-38 Exam Study Guide, LIC Sales Scripts, and detailed Commission Charts.',
    alternates: {
        canonical: 'https://bimasakhi.com/resources',
    },
    openGraph: {
        title: 'Free LIC Agent Study Material & Resources | Bima Sakhi',
        description: 'Download free LIC agent resources including the IC-38 Exam Study Guide, LIC Sales Scripts, and detailed Commission Charts.',
        url: 'https://bimasakhi.com/resources',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Free LIC Agent Study Material & Resources | Bima Sakhi',
        description: 'Download free LIC agent resources including the IC-38 Exam Study Guide, LIC Sales Scripts, and detailed Commission Charts.',
    },
};

export default async function ResourcesPage() {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        'name': 'Free LIC Agent Resources',
        'author': {
            '@type': 'Organization',
            'name': 'Bima Sakhi'
        },
        'about': 'LIC Agent Exam Preparation and Sales Tools',
        'hasPart': [
            {
                '@type': 'CreativeWork',
                'name': 'IC-38 Study Guide'
            },
            {
                '@type': 'CreativeWork',
                'name': 'LIC Agent Sales Script'
            },
            {
                '@type': 'CreativeWork',
                'name': 'LIC Commission Chart PDF'
            }
        ]
    };

    const supabase = getServiceSupabase();

    const { data: resources } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <>
            <Script
                id="schema-resources"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ResourcesIndex initialResources={resources || []} />
        </>
    );
}
