'use client';

import dynamic from 'next/dynamic';

const AdminShell = dynamic(() => import('@/features/admin/AdminShell'), {
    ssr: false,
    loading: () => <div className="container py-8 text-center">Loading Admin Panel...</div>,
});

export default function AdminPage() {
    return <AdminShell />;
}
