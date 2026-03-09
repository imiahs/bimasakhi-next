import ErrorsContent from '@/features/admin/errors/ErrorsContent';

export const metadata = {
    title: 'System Errors | Bima Sakhi Admin',
    description: 'Monitor exception telemetry and stack trace routing.',
};

export default function AdminErrorsPage() {
    return <ErrorsContent />;
}
