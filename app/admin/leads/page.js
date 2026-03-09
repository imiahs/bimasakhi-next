import dynamic from 'next/dynamic';

const LeadsContent = dynamic(() => import('@/features/admin/leads/LeadsContent'), {
    loading: () => <div className="p-8 text-center text-slate-500 animate-pulse">Loading Leads Manager...</div>,
});

export const metadata = {
    title: 'Leads Manager | Bima Sakhi Admin',
    description: 'Review ingested applications from prospective consultants.',
};

export default function LeadsPage() {
    return <LeadsContent />;
}
