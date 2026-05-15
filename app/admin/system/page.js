import ShosControlCenter from '@/features/admin/system/ShosControlCenter';

export const metadata = {
    title: 'SHOS | Bima Sakhi Admin',
    description: 'Operate feature flags, recovery flows, alerts, and system health from one canonical control plane.',
};

export default function AdminSystemPage() {
    return <ShosControlCenter />;
}
