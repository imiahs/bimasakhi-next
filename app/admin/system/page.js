import SystemHealthContent from '@/features/admin/system/SystemHealthContent';

export const metadata = {
    title: 'System Health | Bima Sakhi Admin',
    description: 'Monitor global infrastructure status and backend telemetry.',
};

export default function AdminSystemPage() {
    return <SystemHealthContent />;
}
