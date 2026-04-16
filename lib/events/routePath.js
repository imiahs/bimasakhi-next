export function getEventRoutePath(eventRow = {}) {
    const payloadRoute = typeof eventRow?.payload?.route === 'string'
        ? eventRow.payload.route.trim()
        : '';

    if (payloadRoute) {
        return payloadRoute;
    }

    const eventName = typeof eventRow?.event_name === 'string'
        ? eventRow.event_name.trim()
        : '';

    if (eventName.startsWith('/')) {
        return eventName;
    }

    const legacyRoutePath = typeof eventRow?.route_path === 'string'
        ? eventRow.route_path.trim()
        : '';

    return legacyRoutePath;
}

export function buildEventPathCounts(rows = []) {
    return rows.reduce((acc, row) => {
        const routePath = getEventRoutePath(row);
        if (!routePath) {
            return acc;
        }

        acc[routePath] = (acc[routePath] || 0) + 1;
        return acc;
    }, {});
}
