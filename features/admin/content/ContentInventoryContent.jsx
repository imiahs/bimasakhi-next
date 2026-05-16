'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/admin/ui/StatusBadge';

const PAGE_SIZE = 12;

const TYPE_CONFIG = {
    drafts: {
        label: 'Drafts',
        routeHref: '/admin/ccc/drafts',
        searchPlaceholder: 'Search drafts by slug, headline, or meta title',
        createLabel: 'Create Draft',
        statuses: [
            { value: 'all', label: 'All statuses' },
            { value: 'draft', label: 'Draft' },
            { value: 'review', label: 'In review' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'published', label: 'Published' },
            { value: 'archived', label: 'Archived' },
        ],
    },
    pages: {
        label: 'Pages',
        routeHref: '/admin/pages',
        searchPlaceholder: 'Search pages by title, slug, or meta title',
        createLabel: 'Create Page',
        statuses: [
            { value: 'all', label: 'All statuses' },
            { value: 'draft', label: 'Draft' },
            { value: 'published', label: 'Published' },
            { value: 'archived', label: 'Archived' },
        ],
        secondaryFilter: {
            key: 'type',
            label: 'Page type',
            options: [
                { value: 'all', label: 'All types' },
                { value: 'standard', label: 'Standard' },
                { value: 'campaign', label: 'Campaign' },
            ],
        },
    },
    blog: {
        label: 'Blog',
        routeHref: '/admin/blog',
        searchPlaceholder: 'Search posts by title, slug, author, or metadata',
        createLabel: 'Create Post',
        statuses: [
            { value: 'all', label: 'All statuses' },
            { value: 'draft', label: 'Draft' },
            { value: 'published', label: 'Published' },
            { value: 'archived', label: 'Archived' },
        ],
    },
    resources: {
        label: 'Resources',
        routeHref: '/admin/resources',
        searchPlaceholder: 'Search resources by title, description, or file URL',
        createLabel: 'Create Resource',
        statuses: [
            { value: 'all', label: 'All statuses' },
            { value: 'draft', label: 'Draft' },
            { value: 'published', label: 'Published' },
            { value: 'archived', label: 'Archived' },
        ],
        secondaryFilter: {
            key: 'gated',
            label: 'Lead gate',
            options: [
                { value: 'all', label: 'All resources' },
                { value: 'gated', label: 'Gated' },
                { value: 'ungated', label: 'Ungated' },
            ],
        },
    },
};

function normalizeSlug(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-/]+|[-/]+$/g, '');
}

function formatDate(value) {
    if (!value) return '--';

    try {
        return new Date(value).toLocaleString();
    } catch {
        return String(value);
    }
}

function emptyPageForm() {
    return {
        id: null,
        title: '',
        slug: '',
        meta_title: '',
        meta_description: '',
        status: 'draft',
        is_campaign_page: false,
    };
}

function emptyBlogForm() {
    return {
        id: null,
        title: '',
        slug: '',
        meta_title: '',
        meta_description: '',
        content: '',
        author: 'Admin',
        status: 'draft',
    };
}

function emptyResourceForm() {
    return {
        id: null,
        title: '',
        description: '',
        file_url: '',
        requires_lead_form: true,
        status: 'draft',
    };
}

function buildListPath(type, { page, status, search, secondaryFilter }) {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        status,
    });

    if (search.trim()) {
        params.set('search', search.trim());
    }

    if (type === 'pages') {
        params.set('type', secondaryFilter);
        return `/api/admin/pages?${params.toString()}`;
    }

    if (type === 'resources') {
        params.set('gated', secondaryFilter);
        return `/api/admin/resources?${params.toString()}`;
    }

    if (type === 'blog') {
        return `/api/admin/blog?${params.toString()}`;
    }

    return `/api/admin/ccc/drafts?${params.toString()}`;
}

function normalizeItems(type, payload) {
    if (type === 'drafts') {
        return (payload.drafts || []).map((draft) => ({
            ...draft,
            type,
            title: draft.page_title || draft.hero_headline || draft.slug || 'Untitled draft',
            subtitle: draft.meta_title || draft.hero_headline || draft.review_notes || 'AI content draft',
            slugLabel: draft.slug ? `/${draft.slug}` : '--',
            structureLabel: `parent_id: ${draft.parent_id || 'none'} | full_slug: ${draft.full_slug || draft.slug || '--'} | page_type: ${draft.page_type || 'generated_draft'}`,
            metaLabel: draft.word_count ? `${draft.word_count} words` : 'Draft',
            updatedLabel: draft.updated_at || draft.created_at,
        }));
    }

    if (type === 'pages') {
        return (payload.pages || []).map((page) => ({
            ...page,
            type,
            title: page.title || page.slug || 'Untitled page',
            subtitle: page.meta_title || 'Custom page',
            slugLabel: page.slug ? `/pages/${page.slug}` : '--',
            structureLabel: `parent_id: ${page.parent_id || 'none'} | full_slug: ${page.full_slug || page.slug || '--'} | page_type: ${page.page_type || (page.is_campaign_page ? 'campaign_page' : 'custom_page')}`,
            metaLabel: page.is_campaign_page ? 'Campaign page' : 'Standard page',
            updatedLabel: page.updated_at || page.created_at,
        }));
    }

    if (type === 'blog') {
        return (payload.posts || []).map((post) => ({
            ...post,
            type,
            title: post.title || post.slug || 'Untitled post',
            subtitle: post.meta_description || post.meta_title || 'Blog post',
            slugLabel: post.slug ? `/blog/${post.slug}` : '--',
            structureLabel: `parent_id: ${post.parent_id || 'none'} | full_slug: ${post.full_slug || (post.slug ? `blog/${post.slug}` : '--')} | page_type: ${post.page_type || 'blog_post'}`,
            metaLabel: `${post.author || 'Admin'}${typeof post.views === 'number' ? ` • ${post.views} views` : ''}`,
            updatedLabel: post.updated_at || post.created_at,
        }));
    }

    return (payload.resources || []).map((resource) => ({
        ...resource,
        type,
        title: resource.title || 'Untitled resource',
        subtitle: resource.description || 'Downloadable resource',
        slugLabel: resource.file_url || '--',
        structureLabel: 'Not a CMS route',
        metaLabel: resource.requires_lead_form ? 'Gated download' : 'Ungated download',
        updatedLabel: resource.updated_at || resource.created_at,
    }));
}

function SectionHeader({ forcedType, showHeader }) {
    if (!showHeader) {
        return (
            <div>
                <p className="admin-kicker">Unified Control</p>
                <h2 className="admin-heading-lg mt-2">Unified Content Inventory</h2>
                <p className="admin-copy mt-2 max-w-3xl text-sm">
                    One operator surface for drafts, pages, blog, and resources. This closes the content-control gap without touching the locked runtime systems.
                </p>
            </div>
        );
    }

    const title = forcedType ? `${TYPE_CONFIG[forcedType].label} Inventory` : 'Unified Content Inventory';
    const copy = forcedType
        ? `Article 7 control surface for ${TYPE_CONFIG[forcedType].label.toLowerCase()}: view, create, edit, search, filter, paginate, publish, archive, and restore.`
        : 'Article 7 control surface for drafts, pages, blog, and resources from one place.';

    return (
        <div>
            <p className="admin-kicker">Content Control</p>
            <h1 className="admin-heading-xl mt-3 max-w-3xl">{title}</h1>
            <p className="admin-copy mt-4 max-w-3xl text-sm">{copy}</p>
        </div>
    );
}

function ModalShell({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
            <div className="admin-panel max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                        <p className="admin-kicker">Content Editor</p>
                        <h2 className="admin-heading-lg mt-2">{title}</h2>
                    </div>
                    <button type="button" onClick={onClose} className="admin-button-secondary">Close</button>
                </div>
                {children}
            </div>
        </div>
    );
}

export default function ContentInventoryContent({ forcedType = null, showHeader = true }) {
    const router = useRouter();
    const initialType = forcedType || 'drafts';
    const [activeType, setActiveType] = useState(initialType);
    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search);
    const [statusFilter, setStatusFilter] = useState('all');
    const [secondaryFilter, setSecondaryFilter] = useState('all');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: PAGE_SIZE });
    const [rowActionKey, setRowActionKey] = useState(null);

    const [pageForm, setPageForm] = useState(emptyPageForm());
    const [pageEditorOpen, setPageEditorOpen] = useState(false);
    const [pageSubmitting, setPageSubmitting] = useState(false);
    const [pageSlugDirty, setPageSlugDirty] = useState(false);
    const [pageError, setPageError] = useState(null);

    const [blogForm, setBlogForm] = useState(emptyBlogForm());
    const [blogEditorOpen, setBlogEditorOpen] = useState(false);
    const [blogSubmitting, setBlogSubmitting] = useState(false);
    const [blogSlugDirty, setBlogSlugDirty] = useState(false);
    const [blogError, setBlogError] = useState(null);

    const [resourceForm, setResourceForm] = useState(emptyResourceForm());
    const [resourceEditorOpen, setResourceEditorOpen] = useState(false);
    const [resourceSubmitting, setResourceSubmitting] = useState(false);
    const [resourceUploading, setResourceUploading] = useState(false);
    const [resourceError, setResourceError] = useState(null);

    const activeConfig = TYPE_CONFIG[activeType];
    const secondaryConfig = activeConfig.secondaryFilter || null;

    useEffect(() => {
        if (forcedType) {
            setActiveType(forcedType);
        }
    }, [forcedType]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeType, deferredSearch, statusFilter, secondaryFilter]);

    useEffect(() => {
        setStatusFilter('all');
        setSecondaryFilter('all');
        setError(null);
        setMessage(null);
    }, [activeType]);

    async function loadItems(pageOverride = currentPage) {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(buildListPath(activeType, {
                page: pageOverride,
                status: statusFilter,
                search: deferredSearch,
                secondaryFilter,
            }), {
                credentials: 'include',
                cache: 'no-store',
            });

            const data = await response.json();

            if (!response.ok || data.success === false) {
                throw new Error(data.error || `Failed to load ${activeType}`);
            }

            const nextItems = normalizeItems(activeType, data);
            const nextTotalPages = data.totalPages || 1;

            if (nextTotalPages < pageOverride && nextTotalPages > 0) {
                setCurrentPage(nextTotalPages);
                return;
            }

            setItems(nextItems);
            setPagination({
                total: data.total || 0,
                totalPages: nextTotalPages,
                limit: data.limit || PAGE_SIZE,
            });
        } catch (loadError) {
            setItems([]);
            setPagination({ total: 0, totalPages: 1, limit: PAGE_SIZE });
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadItems();
    }, [activeType, currentPage, deferredSearch, secondaryFilter, statusFilter]);

    const startRow = pagination.total === 0 ? 0 : ((currentPage - 1) * pagination.limit) + 1;
    const endRow = Math.min(currentPage * pagination.limit, pagination.total);

    const tableHeading = useMemo(() => {
        if (activeType === 'drafts') return 'Draft inventory';
        if (activeType === 'pages') return 'Page inventory';
        if (activeType === 'blog') return 'Blog inventory';
        return 'Resource inventory';
    }, [activeType]);

    function setNotice(type, text) {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    }

    function closePageEditor() {
        setPageEditorOpen(false);
        setPageForm(emptyPageForm());
        setPageSlugDirty(false);
        setPageError(null);
    }

    function closeBlogEditor() {
        setBlogEditorOpen(false);
        setBlogForm(emptyBlogForm());
        setBlogSlugDirty(false);
        setBlogError(null);
    }

    function closeResourceEditor() {
        setResourceEditorOpen(false);
        setResourceForm(emptyResourceForm());
        setResourceError(null);
    }

    function openPageCreate() {
        setPageForm(emptyPageForm());
        setPageSlugDirty(false);
        setPageError(null);
        setPageEditorOpen(true);
    }

    function openPageEdit(item) {
        setPageForm({
            id: item.id,
            title: item.title || '',
            slug: item.slug || '',
            meta_title: item.meta_title || '',
            meta_description: item.meta_description || '',
            status: item.status || 'draft',
            is_campaign_page: Boolean(item.is_campaign_page),
        });
        setPageSlugDirty(true);
        setPageError(null);
        setPageEditorOpen(true);
    }

    function openBlogCreate() {
        setBlogForm(emptyBlogForm());
        setBlogSlugDirty(false);
        setBlogError(null);
        setBlogEditorOpen(true);
    }

    function openBlogEdit(item) {
        setBlogForm({
            id: item.id,
            title: item.title || '',
            slug: item.slug || '',
            meta_title: item.meta_title || '',
            meta_description: item.meta_description || '',
            content: item.content || '',
            author: item.author || 'Admin',
            status: item.status || 'draft',
        });
        setBlogSlugDirty(true);
        setBlogError(null);
        setBlogEditorOpen(true);
    }

    function openResourceCreate() {
        setResourceForm(emptyResourceForm());
        setResourceError(null);
        setResourceEditorOpen(true);
    }

    function openResourceEdit(item) {
        setResourceForm({
            id: item.id,
            title: item.title || '',
            description: item.description || '',
            file_url: item.file_url || '',
            requires_lead_form: item.requires_lead_form !== false,
            status: item.status || 'draft',
        });
        setResourceError(null);
        setResourceEditorOpen(true);
    }

    async function submitPageForm(event) {
        event.preventDefault();
        setPageSubmitting(true);
        setPageError(null);

        try {
            const endpoint = pageForm.id ? `/api/admin/pages/${pageForm.id}` : '/api/admin/pages';
            const method = pageForm.id ? 'PATCH' : 'POST';

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(pageForm),
            });

            const data = await response.json();

            if (!response.ok || data.success === false) {
                throw new Error(data.error || 'Failed to save page');
            }

            closePageEditor();
            await loadItems(pageForm.id ? currentPage : 1);
            if (!pageForm.id) setCurrentPage(1);
            setNotice('success', pageForm.id ? 'Page updated.' : 'Page created.');
        } catch (submitError) {
            setPageError(submitError.message);
        } finally {
            setPageSubmitting(false);
        }
    }

    async function submitBlogForm(event) {
        event.preventDefault();
        setBlogSubmitting(true);
        setBlogError(null);

        try {
            const response = await fetch('/api/admin/blog', {
                method: blogForm.id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(blogForm),
            });

            const data = await response.json();

            if (!response.ok || data.success === false) {
                throw new Error(data.error || 'Failed to save post');
            }

            closeBlogEditor();
            await loadItems(blogForm.id ? currentPage : 1);
            if (!blogForm.id) setCurrentPage(1);
            setNotice('success', blogForm.id ? 'Post updated.' : 'Post created.');
        } catch (submitError) {
            setBlogError(submitError.message);
        } finally {
            setBlogSubmitting(false);
        }
    }

    async function submitResourceForm(event) {
        event.preventDefault();
        setResourceSubmitting(true);
        setResourceError(null);

        try {
            const response = await fetch('/api/admin/resources', {
                method: resourceForm.id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(resourceForm),
            });

            const data = await response.json();

            if (!response.ok || data.success === false) {
                throw new Error(data.error || 'Failed to save resource');
            }

            closeResourceEditor();
            await loadItems(resourceForm.id ? currentPage : 1);
            if (!resourceForm.id) setCurrentPage(1);
            setNotice('success', resourceForm.id ? 'Resource updated.' : 'Resource created.');
        } catch (submitError) {
            setResourceError(submitError.message);
        } finally {
            setResourceSubmitting(false);
        }
    }

    async function uploadResourceFile(file) {
        if (!file) {
            return;
        }

        setResourceUploading(true);
        setResourceError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/admin/resources/upload', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok || !data.file_url) {
                throw new Error(data.error || 'Upload failed');
            }

            setResourceForm((current) => ({ ...current, file_url: data.file_url }));
            setNotice('success', 'Resource file uploaded.');
        } catch (uploadError) {
            setResourceError(uploadError.message);
        } finally {
            setResourceUploading(false);
        }
    }

    async function handleCreateForActiveType() {
        if (activeType === 'drafts') {
            try {
                const response = await fetch('/api/admin/ccc/drafts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ action: 'create_blank' }),
                });

                const data = await response.json();

                if (!response.ok || data.success === false || !data.draft?.id) {
                    throw new Error(data.error || 'Failed to create draft');
                }

                router.push(`/admin/ccc/drafts/${data.draft.id}`);
                return;
            } catch (createError) {
                setError(createError.message);
                return;
            }
        }

        if (activeType === 'pages') {
            openPageCreate();
            return;
        }

        if (activeType === 'blog') {
            openBlogCreate();
            return;
        }

        openResourceCreate();
    }

    async function handleRowAction(item, action) {
        const actionKey = `${activeType}:${item.id}:${action}`;
        setRowActionKey(actionKey);
        setError(null);

        try {
            let response;

            if (activeType === 'drafts') {
                response = await fetch(`/api/admin/ccc/drafts/${item.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ action }),
                });
            } else if (activeType === 'pages') {
                if (action === 'archive') {
                    response = await fetch(`/api/admin/pages/${item.id}`, {
                        method: 'DELETE',
                        credentials: 'include',
                    });
                } else {
                    response = await fetch(`/api/admin/pages/${item.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ status: action === 'restore' ? 'draft' : 'published' }),
                    });
                }
            } else if (activeType === 'blog') {
                if (action === 'archive') {
                    response = await fetch(`/api/admin/blog?id=${encodeURIComponent(item.id)}`, {
                        method: 'DELETE',
                        credentials: 'include',
                    });
                } else {
                    response = await fetch('/api/admin/blog', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ id: item.id, status: action === 'restore' ? 'draft' : 'published' }),
                    });
                }
            } else if (action === 'archive') {
                response = await fetch(`/api/admin/resources?id=${encodeURIComponent(item.id)}`, {
                    method: 'DELETE',
                    credentials: 'include',
                });
            } else {
                response = await fetch('/api/admin/resources', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ id: item.id, status: action === 'restore' ? 'draft' : 'published' }),
                });
            }

            const data = await response.json();

            if (!response.ok || data.success === false) {
                throw new Error(data.error || `Failed to ${action} ${activeType}`);
            }

            await loadItems();
            setNotice('success', `${TYPE_CONFIG[activeType].label.slice(0, -1) || TYPE_CONFIG[activeType].label} ${action} action completed.`);
        } catch (actionError) {
            setError(actionError.message);
        } finally {
            setRowActionKey(null);
        }
    }

    function renderRowActions(item) {
        const isBusy = Boolean(rowActionKey);

        if (activeType === 'drafts') {
            return (
                <div className="flex flex-wrap justify-end gap-2">
                    <Link href={`/admin/ccc/drafts/${item.id}`} className="admin-button-secondary">Edit + FAQ</Link>
                    {['draft', 'review'].includes(item.status) && (
                        <button
                            type="button"
                            className="admin-button-primary"
                            disabled={isBusy}
                            onClick={() => handleRowAction(item, 'approve')}
                        >
                            Publish
                        </button>
                    )}
                    {['published', 'approved'].includes(item.status) && (
                        <button
                            type="button"
                            className="admin-button-secondary"
                            disabled={isBusy}
                            onClick={() => handleRowAction(item, 'unpublish')}
                        >
                            Unpublish
                        </button>
                    )}
                    {item.status === 'archived' ? (
                        <button
                            type="button"
                            className="admin-button-secondary"
                            disabled={isBusy}
                            onClick={() => handleRowAction(item, 'restore')}
                        >
                            Restore
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="admin-button-danger"
                            disabled={isBusy}
                            onClick={() => handleRowAction(item, 'archive')}
                        >
                            Archive
                        </button>
                    )}
                </div>
            );
        }

        if (activeType === 'pages') {
            return (
                <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => openPageEdit(item)} className="admin-button-secondary">Edit</button>
                    <Link href={`/admin/pages/${item.id}`} className="admin-button-secondary">Edit Blocks</Link>
                    {item.status === 'archived' ? (
                        <button type="button" onClick={() => handleRowAction(item, 'restore')} className="admin-button-secondary" disabled={isBusy}>Restore</button>
                    ) : (
                        <>
                            {item.status !== 'published' && (
                                <button type="button" onClick={() => handleRowAction(item, 'publish')} className="admin-button-primary" disabled={isBusy}>Publish</button>
                            )}
                            <button type="button" onClick={() => handleRowAction(item, 'archive')} className="admin-button-danger" disabled={isBusy}>Archive</button>
                        </>
                    )}
                </div>
            );
        }

        if (activeType === 'blog') {
            return (
                <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => openBlogEdit(item)} className="admin-button-secondary">Edit</button>
                    {item.slug && item.status === 'published' && (
                        <Link href={`/blog/${item.slug}`} target="_blank" className="admin-button-secondary">Preview</Link>
                    )}
                    {item.status === 'archived' ? (
                        <button type="button" onClick={() => handleRowAction(item, 'restore')} className="admin-button-secondary" disabled={isBusy}>Restore</button>
                    ) : (
                        <>
                            {item.status !== 'published' && (
                                <button type="button" onClick={() => handleRowAction(item, 'publish')} className="admin-button-primary" disabled={isBusy}>Publish</button>
                            )}
                            <button type="button" onClick={() => handleRowAction(item, 'archive')} className="admin-button-danger" disabled={isBusy}>Archive</button>
                        </>
                    )}
                </div>
            );
        }

        return (
            <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => openResourceEdit(item)} className="admin-button-secondary">Edit</button>
                {item.status === 'archived' ? (
                    <button type="button" onClick={() => handleRowAction(item, 'restore')} className="admin-button-secondary" disabled={isBusy}>Restore</button>
                ) : (
                    <>
                        {item.status !== 'published' && (
                            <button type="button" onClick={() => handleRowAction(item, 'publish')} className="admin-button-primary" disabled={isBusy}>Publish</button>
                        )}
                        <button type="button" onClick={() => handleRowAction(item, 'archive')} className="admin-button-danger" disabled={isBusy}>Archive</button>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <SectionHeader forcedType={forcedType} showHeader={showHeader} />

            {message && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium ${message.type === 'success' ? 'admin-toast-success' : 'admin-toast-error'}`}>
                    {message.text}
                </div>
            )}

            {error && (
                <div className="admin-toast-error rounded-xl px-4 py-3 text-sm">{error}</div>
            )}

            {!forcedType && (
                <div className="flex flex-wrap gap-2">
                    {Object.entries(TYPE_CONFIG).map(([type, config]) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setActiveType(type)}
                            className={activeType === type ? 'admin-button-primary' : 'admin-button-secondary'}
                        >
                            {config.label}
                        </button>
                    ))}
                </div>
            )}

            <div className="admin-panel rounded-2xl p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex-1">
                        <label htmlFor="content-search" className="sr-only">Search inventory</label>
                        <input
                            id="content-search"
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={activeConfig.searchPlaceholder}
                            className="admin-input px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="admin-select px-3 py-2 text-sm">
                            {activeConfig.statuses.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>

                        {secondaryConfig ? (
                            <select value={secondaryFilter} onChange={(event) => setSecondaryFilter(event.target.value)} className="admin-select px-3 py-2 text-sm">
                                {secondaryConfig.options.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-slate-500">
                                Filters scoped to status for this content type.
                            </div>
                        )}
                    </div>

                    <button type="button" onClick={handleCreateForActiveType} className="admin-button-primary self-start xl:self-auto">
                        {activeConfig.createLabel}
                    </button>
                </div>
            </div>

            <div className="admin-panel overflow-hidden rounded-2xl">
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
                    <div>
                        <p className="admin-kicker">{TYPE_CONFIG[activeType].label}</p>
                        <h3 className="admin-heading-lg mt-2">{tableHeading}</h3>
                    </div>
                    <div className="text-right text-sm text-slate-400">
                        {pagination.total > 0 ? `${startRow}-${endRow} of ${pagination.total}` : 'No records'}
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center px-6 py-16 text-center">
                        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-500" />
                        <p className="admin-kicker mt-6">Inventory sync</p>
                        <p className="mt-2 text-sm text-slate-500">Loading {TYPE_CONFIG[activeType].label.toLowerCase()}...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="px-6 py-16 text-center text-sm text-slate-500">
                        No {TYPE_CONFIG[activeType].label.toLowerCase()} match the current filters.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap text-left text-sm">
                            <thead className="border-b border-white/[0.06] bg-white/[0.03] text-[11px] uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-5 py-4 font-semibold">Title</th>
                                    <th className="px-5 py-4 font-semibold">Slug / Path</th>
                                    <th className="px-5 py-4 font-semibold">Status</th>
                                    <th className="px-5 py-4 font-semibold">Updated</th>
                                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.id} className="border-b border-white/[0.04] align-top text-slate-200 last:border-b-0">
                                        <td className="px-5 py-4">
                                            <div className="space-y-1.5">
                                                <p className="font-semibold text-white">{item.title}</p>
                                                <p className="max-w-md whitespace-normal text-xs text-slate-400">{item.subtitle}</p>
                                                <p className="text-xs text-slate-500">{item.metaLabel}</p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="font-mono text-xs text-emerald-300">{item.slugLabel}</span>
                                            <span className="mt-1 block whitespace-normal font-mono text-[11px] text-slate-500">{item.structureLabel}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <StatusBadge status={item.status} />
                                        </td>
                                        <td className="px-5 py-4 text-xs text-slate-400">{formatDate(item.updatedLabel)}</td>
                                        <td className="px-5 py-4 text-right">{renderRowActions(item)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex items-center justify-between gap-4 border-t border-white/[0.06] px-5 py-4 text-sm">
                    <span className="text-slate-500">Operator route: <Link href={activeConfig.routeHref} className="text-emerald-400 underline-offset-4 hover:underline">{activeConfig.routeHref}</Link></span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                            disabled={currentPage === 1}
                            className="admin-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentPage((current) => Math.min(pagination.totalPages || 1, current + 1))}
                            disabled={currentPage >= (pagination.totalPages || 1)}
                            className="admin-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {pageEditorOpen && (
                <ModalShell title={pageForm.id ? 'Edit Page Details' : 'Create Page'} onClose={closePageEditor}>
                    <form className="space-y-4" onSubmit={submitPageForm}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-200">Title</label>
                                <input
                                    type="text"
                                    value={pageForm.title}
                                    onChange={(event) => {
                                        const nextTitle = event.target.value;
                                        setPageForm((current) => ({
                                            ...current,
                                            title: nextTitle,
                                            slug: pageSlugDirty ? current.slug : normalizeSlug(nextTitle),
                                        }));
                                    }}
                                    className="admin-input px-3 py-2 text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-200">Slug</label>
                                <input
                                    type="text"
                                    value={pageForm.slug}
                                    onChange={(event) => {
                                        setPageSlugDirty(true);
                                        setPageForm((current) => ({ ...current, slug: event.target.value }));
                                    }}
                                    className="admin-input px-3 py-2 text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-200">Meta title</label>
                            <input type="text" value={pageForm.meta_title} onChange={(event) => setPageForm((current) => ({ ...current, meta_title: event.target.value }))} className="admin-input px-3 py-2 text-sm" />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-200">Meta description</label>
                            <textarea value={pageForm.meta_description} onChange={(event) => setPageForm((current) => ({ ...current, meta_description: event.target.value }))} className="admin-input min-h-28 px-3 py-2 text-sm" />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-200">Status</label>
                                <select value={pageForm.status} onChange={(event) => setPageForm((current) => ({ ...current, status: event.target.value }))} className="admin-select px-3 py-2 text-sm">
                                    {TYPE_CONFIG.pages.statuses.filter((option) => option.value !== 'all').map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                            <label className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                                <input type="checkbox" checked={pageForm.is_campaign_page} onChange={(event) => setPageForm((current) => ({ ...current, is_campaign_page: event.target.checked }))} />
                                Campaign page
                            </label>
                        </div>

                        {pageError && <div className="admin-toast-error rounded-xl px-4 py-3 text-sm">{pageError}</div>}

                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={closePageEditor} className="admin-button-secondary">Cancel</button>
                            <button type="submit" disabled={pageSubmitting} className="admin-button-primary">{pageSubmitting ? 'Saving...' : 'Save Page'}</button>
                        </div>
                    </form>
                </ModalShell>
            )}

            {blogEditorOpen && (
                <ModalShell title={blogForm.id ? 'Edit Blog Post' : 'Create Blog Post'} onClose={closeBlogEditor}>
                    <form className="space-y-4" onSubmit={submitBlogForm}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-200">Title</label>
                                <input
                                    type="text"
                                    value={blogForm.title}
                                    onChange={(event) => {
                                        const nextTitle = event.target.value;
                                        setBlogForm((current) => ({
                                            ...current,
                                            title: nextTitle,
                                            slug: blogSlugDirty ? current.slug : normalizeSlug(nextTitle),
                                        }));
                                    }}
                                    className="admin-input px-3 py-2 text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-200">Slug</label>
                                <input
                                    type="text"
                                    value={blogForm.slug}
                                    onChange={(event) => {
                                        setBlogSlugDirty(true);
                                        setBlogForm((current) => ({ ...current, slug: event.target.value }));
                                    }}
                                    className="admin-input px-3 py-2 text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-200">Meta title</label>
                                <input type="text" value={blogForm.meta_title} onChange={(event) => setBlogForm((current) => ({ ...current, meta_title: event.target.value }))} className="admin-input px-3 py-2 text-sm" />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-200">Author</label>
                                <input type="text" value={blogForm.author} onChange={(event) => setBlogForm((current) => ({ ...current, author: event.target.value }))} className="admin-input px-3 py-2 text-sm" />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-200">Meta description</label>
                            <textarea value={blogForm.meta_description} onChange={(event) => setBlogForm((current) => ({ ...current, meta_description: event.target.value }))} className="admin-input min-h-24 px-3 py-2 text-sm" />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-200">Content</label>
                            <textarea value={blogForm.content} onChange={(event) => setBlogForm((current) => ({ ...current, content: event.target.value }))} className="admin-input min-h-56 px-3 py-2 text-sm" required />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-200">Status</label>
                            <select value={blogForm.status} onChange={(event) => setBlogForm((current) => ({ ...current, status: event.target.value }))} className="admin-select px-3 py-2 text-sm">
                                {TYPE_CONFIG.blog.statuses.filter((option) => option.value !== 'all').map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>

                        {blogError && <div className="admin-toast-error rounded-xl px-4 py-3 text-sm">{blogError}</div>}

                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={closeBlogEditor} className="admin-button-secondary">Cancel</button>
                            <button type="submit" disabled={blogSubmitting} className="admin-button-primary">{blogSubmitting ? 'Saving...' : 'Save Post'}</button>
                        </div>
                    </form>
                </ModalShell>
            )}

            {resourceEditorOpen && (
                <ModalShell title={resourceForm.id ? 'Edit Resource' : 'Create Resource'} onClose={closeResourceEditor}>
                    <form className="space-y-4" onSubmit={submitResourceForm}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-200">Title</label>
                                <input type="text" value={resourceForm.title} onChange={(event) => setResourceForm((current) => ({ ...current, title: event.target.value }))} className="admin-input px-3 py-2 text-sm" required />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-200">Status</label>
                                <select value={resourceForm.status} onChange={(event) => setResourceForm((current) => ({ ...current, status: event.target.value }))} className="admin-select px-3 py-2 text-sm">
                                    {TYPE_CONFIG.resources.statuses.filter((option) => option.value !== 'all').map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-200">Description</label>
                            <textarea value={resourceForm.description} onChange={(event) => setResourceForm((current) => ({ ...current, description: event.target.value }))} className="admin-input min-h-24 px-3 py-2 text-sm" />
                        </div>

                        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-200">File URL</label>
                                <input type="text" value={resourceForm.file_url} onChange={(event) => setResourceForm((current) => ({ ...current, file_url: event.target.value }))} className="admin-input px-3 py-2 text-sm" required />
                            </div>
                            <div className="self-end">
                                <label className="admin-button-secondary cursor-pointer">
                                    {resourceUploading ? 'Uploading...' : 'Upload File'}
                                    <input type="file" className="hidden" disabled={resourceUploading} onChange={(event) => uploadResourceFile(event.target.files?.[0])} />
                                </label>
                            </div>
                        </div>

                        <label className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                            <input type="checkbox" checked={resourceForm.requires_lead_form} onChange={(event) => setResourceForm((current) => ({ ...current, requires_lead_form: event.target.checked }))} />
                            Require lead capture before download
                        </label>

                        {resourceError && <div className="admin-toast-error rounded-xl px-4 py-3 text-sm">{resourceError}</div>}

                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={closeResourceEditor} className="admin-button-secondary">Cancel</button>
                            <button type="submit" disabled={resourceSubmitting || resourceUploading} className="admin-button-primary">{resourceSubmitting ? 'Saving...' : 'Save Resource'}</button>
                        </div>
                    </form>
                </ModalShell>
            )}
        </div>
    );
}
