import dynamic from 'next/dynamic';

const AnalyticsContent = dynamic(() => import('@/features/admin/analytics/AnalyticsContent'), {
    loading: () => <div className="p-8 text-center text-slate-500 animate-pulse">Loading Analytics Dashboard...</div>,
});

export const metadata = {
    title: 'Analytics | Bima Sakhi Admin',
    description: 'Monitor inbound lead telemetry and internal web performance.',
};

export default function AnalyticsPage() {
    return <AnalyticsContent />;
}
