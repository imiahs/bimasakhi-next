import PageEditorContent from '@/features/admin/pages/PageEditorContent';

export const metadata = {
    title: 'Visual Page Editor | Bima Sakhi Admin',
    description: 'Edit dynamic block components for custom landing pages.',
};

export default function AdminPageEditor({ params }) {
    return <PageEditorContent pageId={params.id} />;
}
