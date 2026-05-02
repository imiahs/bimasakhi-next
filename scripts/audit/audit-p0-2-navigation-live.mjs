import {
  addCheck,
  addError,
  adminLoginPayload,
  canonicalBaseUrl,
  envPresence,
  finalize,
  getServiceSupabase,
  loadEnv,
  makeResult,
  writeResult,
} from './_auditUtils.mjs';

loadEnv();

const result = makeResult('p0-2-navigation-live-proof');
const baseUrl = canonicalBaseUrl();
const supabase = getServiceSupabase();

const MENU_KEYS = ['public_header', 'public_footer', 'admin_sidebar'];

function getArg(name, fallback = null) {
    const prefix = `--${name}=`;
    const value = process.argv.find((arg) => arg.startsWith(prefix));
    return value ? value.slice(prefix.length) : fallback;
}

function normalizeHeaderCookie(headers) {
    const raw = headers.get('set-cookie');
    if (!raw) {
        return '';
    }

    return raw.split(';')[0].trim();
}

async function request(url, options = {}, timeoutMs = 25000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });

        const text = await response.text();
        let body = text;

        try {
            body = JSON.parse(text);
        } catch {
            body = text;
        }

        return {
            ok: response.ok,
            status: response.status,
            headers: response.headers,
            body,
        };
    } finally {
        clearTimeout(timer);
    }
}

function buildNavigationPayload(item, nextName) {
    return {
        name: nextName,
        slug: item.slug || '',
        parent_id: item.parent_id || null,
        order_index: item.order_index || 0,
        is_active: item.is_active !== false,
        is_cta: Boolean(item.is_cta),
        menu_key: item.menu_key,
        icon_key: item.icon_key || '',
        note: item.note || '',
    };
}

function findTreeItemByName(items = [], targetName) {
    for (const item of items) {
        if (item?.name === targetName) {
            return item;
        }

        const childMatch = findTreeItemByName(item?.children || [], targetName);
        if (childMatch) {
            return childMatch;
        }
    }

    return null;
}

function summarizeMenuCounts(rows = []) {
    return rows.reduce((counts, row) => {
        counts[row.menu_key] = (counts[row.menu_key] || 0) + 1;
        return counts;
    }, {});
}

function inspectParentIntegrity(rows = []) {
    const rowsById = new Map(rows.map((row) => [row.id, row]));
    const missingParents = [];
    const crossMenuParents = [];

    for (const row of rows) {
        if (!row.parent_id) {
            continue;
        }

        const parent = rowsById.get(row.parent_id);
        if (!parent) {
            missingParents.push(row);
            continue;
        }

        if (parent.menu_key !== row.menu_key) {
            crossMenuParents.push({ row, parent });
        }
    }

    return {
        missingParents,
        crossMenuParents,
    };
}

try {
    addCheck(result, 'env_presence_masked', 'INFO', envPresence([
        'ADMIN_EMAIL',
        'ADMIN_PASSWORD',
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
    ]));

    const expectedVersion = getArg('expected-version');
    const suffix = getArg('suffix', 'P0.2 PROD');

    const login = await request(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Origin: baseUrl,
        },
        body: JSON.stringify(adminLoginPayload()),
    });

    const cookieHeader = normalizeHeaderCookie(login.headers);
    addCheck(result, 'admin_login', login.ok && Boolean(cookieHeader) ? 'PASS' : 'FAIL', {
        status: login.status,
        ok: login.ok,
        cookie_present: Boolean(cookieHeader),
        body: typeof login.body === 'string' ? login.body.slice(0, 240) : login.body,
    });

    if (!login.ok || !cookieHeader) {
        throw new Error('Production admin login failed.');
    }

    const authedRequest = (path, options = {}, timeoutMs) => request(`${baseUrl}${path}`, {
        ...options,
        headers: {
            Origin: baseUrl,
            Cookie: cookieHeader,
            ...(options.headers || {}),
        },
    }, timeoutMs);

    const statusResponse = await request(`${baseUrl}/api/status`, {}, 25000);
    const observedVersion = statusResponse.body?.version || null;
    const deploymentPass = statusResponse.ok && (!expectedVersion || observedVersion === expectedVersion);
    addCheck(result, 'deployment_status', deploymentPass ? 'PASS' : 'FAIL', {
        status: statusResponse.status,
        ok: statusResponse.ok,
        expected_version: expectedVersion,
        observed_version: observedVersion,
        overall_health: statusResponse.body?.overall_health || null,
        environment: statusResponse.body?.environment || null,
    });

    const publicHeaderApi = await request(`${baseUrl}/api/navigation`, {}, 25000);
    const publicFooterApi = await request(`${baseUrl}/api/navigation?menu=public_footer`, {}, 25000);
    const adminHeaderApi = await authedRequest('/api/admin/navigation?menu=public_header', {}, 25000);
    const adminFooterApi = await authedRequest('/api/admin/navigation?menu=public_footer', {}, 25000);
    const adminSidebarApi = await authedRequest('/api/admin/navigation?menu=admin_sidebar', {}, 25000);

    addCheck(result, 'api_public_header', publicHeaderApi.ok && publicHeaderApi.body?.success === true ? 'PASS' : 'FAIL', {
        status: publicHeaderApi.status,
        menu_key: publicHeaderApi.body?.menuKey,
        root_count: Array.isArray(publicHeaderApi.body?.menu) ? publicHeaderApi.body.menu.length : null,
    });

    addCheck(result, 'api_public_footer', publicFooterApi.ok && publicFooterApi.body?.success === true ? 'PASS' : 'FAIL', {
        status: publicFooterApi.status,
        menu_key: publicFooterApi.body?.menuKey,
        root_count: Array.isArray(publicFooterApi.body?.menu) ? publicFooterApi.body.menu.length : null,
    });

    addCheck(result, 'api_admin_sidebar', adminSidebarApi.ok && adminSidebarApi.body?.success === true ? 'PASS' : 'FAIL', {
        status: adminSidebarApi.status,
        menu_key: adminSidebarApi.body?.menuKey,
        item_count: Array.isArray(adminSidebarApi.body?.items) ? adminSidebarApi.body.items.length : null,
        tree_count: Array.isArray(adminSidebarApi.body?.tree) ? adminSidebarApi.body.tree.length : null,
    });

    const headerItems = adminHeaderApi.body?.items || [];
    const footerItems = adminFooterApi.body?.items || [];
    const sidebarItems = adminSidebarApi.body?.items || [];

    const headerTarget = headerItems.find((item) => item.slug === '/' || item.name === 'Home');
    const footerTarget = footerItems.find((item) => item.slug === '/contact' || item.name === 'Contact Us');
    const sidebarTarget = sidebarItems.find((item) => item.slug === '/admin/settings/backups' || item.name === 'Backups');

    addCheck(result, 'mutation_targets_present', headerTarget && footerTarget && sidebarTarget ? 'PASS' : 'FAIL', {
        header_target: headerTarget ? { id: headerTarget.id, name: headerTarget.name } : null,
        footer_target: footerTarget ? { id: footerTarget.id, name: footerTarget.name } : null,
        sidebar_target: sidebarTarget ? { id: sidebarTarget.id, name: sidebarTarget.name } : null,
    });

    if (!headerTarget || !footerTarget || !sidebarTarget) {
        throw new Error('Required production navigation targets were not found.');
    }

    const { data: navigationRows, error: navigationError } = await supabase
        .from('navigation_menu')
        .select('id, name, slug, parent_id, menu_key, is_active')
        .in('menu_key', MENU_KEYS)
        .order('menu_key', { ascending: true })
        .order('order_index', { ascending: true });

    if (navigationError) {
        throw navigationError;
    }

    const menuCounts = summarizeMenuCounts(navigationRows || []);
    const integrity = inspectParentIntegrity(navigationRows || []);
    addCheck(result, 'db_menu_key_separation', MENU_KEYS.every((menuKey) => (menuCounts[menuKey] || 0) > 0) ? 'PASS' : 'FAIL', {
        counts: menuCounts,
    });

    addCheck(result, 'db_parent_child_integrity', integrity.missingParents.length === 0 && integrity.crossMenuParents.length === 0 ? 'PASS' : 'FAIL', {
        missing_parent_count: integrity.missingParents.length,
        cross_menu_count: integrity.crossMenuParents.length,
    });

    const mutations = [
        { label: 'header', item: headerTarget, nextName: `${headerTarget.name} ${suffix}` },
        { label: 'footer', item: footerTarget, nextName: `${footerTarget.name} ${suffix}` },
        { label: 'sidebar', item: sidebarTarget, nextName: `${sidebarTarget.name} ${suffix}` },
    ];

    const successfulMutations = [];

    try {
        for (const mutation of mutations) {
            const patchResponse = await authedRequest(`/api/admin/navigation/${mutation.item.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(buildNavigationPayload(mutation.item, mutation.nextName)),
            }, 25000);

            addCheck(result, `mutation_${mutation.label}`, patchResponse.ok && patchResponse.body?.success === true ? 'PASS' : 'FAIL', {
                status: patchResponse.status,
                updated_name: patchResponse.body?.item?.name || null,
            });

            if (!patchResponse.ok || patchResponse.body?.success !== true) {
                throw new Error(`Failed to update ${mutation.label} navigation item.`);
            }

            successfulMutations.push(mutation);

            if (mutation.label === 'header') {
                const immediate = await request(`${baseUrl}/api/navigation`, {}, 25000);
                const refreshed = await request(`${baseUrl}/api/navigation`, {}, 25000);
                const visibleImmediately = Boolean(findTreeItemByName(immediate.body?.menu || [], mutation.nextName));
                const visibleAfterReload = Boolean(findTreeItemByName(refreshed.body?.menu || [], mutation.nextName));
                addCheck(result, 'live_header_api_reflects_change', visibleImmediately && visibleAfterReload ? 'PASS' : 'FAIL', {
                    visible_immediately: visibleImmediately,
                    visible_after_reload: visibleAfterReload,
                });
            }

            if (mutation.label === 'footer') {
                const immediate = await request(`${baseUrl}/api/navigation?menu=public_footer`, {}, 25000);
                const refreshed = await request(`${baseUrl}/api/navigation?menu=public_footer`, {}, 25000);
                const visibleImmediately = Boolean(findTreeItemByName(immediate.body?.menu || [], mutation.nextName));
                const visibleAfterReload = Boolean(findTreeItemByName(refreshed.body?.menu || [], mutation.nextName));
                addCheck(result, 'live_footer_api_reflects_change', visibleImmediately && visibleAfterReload ? 'PASS' : 'FAIL', {
                    visible_immediately: visibleImmediately,
                    visible_after_reload: visibleAfterReload,
                });
            }

            if (mutation.label === 'sidebar') {
                const immediate = await authedRequest('/api/admin/navigation?menu=admin_sidebar', {}, 25000);
                const refreshed = await authedRequest('/api/admin/navigation?menu=admin_sidebar', {}, 25000);
                const visibleImmediately = Boolean((immediate.body?.items || []).find((item) => item.name === mutation.nextName));
                const visibleAfterReload = Boolean((refreshed.body?.items || []).find((item) => item.name === mutation.nextName));
                addCheck(result, 'live_sidebar_api_reflects_change', visibleImmediately && visibleAfterReload ? 'PASS' : 'FAIL', {
                    visible_immediately: visibleImmediately,
                    visible_after_reload: visibleAfterReload,
                });
            }
        }
    } finally {
        for (const mutation of successfulMutations.reverse()) {
            try {
                const revertResponse = await authedRequest(`/api/admin/navigation/${mutation.item.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(buildNavigationPayload(mutation.item, mutation.item.name)),
                }, 25000);

                addCheck(result, `revert_${mutation.label}`, revertResponse.ok && revertResponse.body?.success === true ? 'PASS' : 'FAIL', {
                    status: revertResponse.status,
                    reverted_name: revertResponse.body?.item?.name || null,
                });
            } catch (error) {
                addError(result, `revert_${mutation.label}`, error);
            }
        }
    }
} catch (error) {
    addError(result, 'p0_2_navigation_live_unhandled', error);
}

writeResult(finalize(result));