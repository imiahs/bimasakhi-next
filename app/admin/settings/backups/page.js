import BackupsContent from '@/features/admin/settings/BackupsContent';

export const metadata = {
    title: 'Data Backups | Bima Sakhi Admin',
    description: 'Manage manual and automated system backups.',
};

export default function AdminBackupsPage() {
    return <BackupsContent />;
}
