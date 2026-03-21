export async function safeLog(type, message, metadata = {}) {
    try {
        const { logSystemEvent } = await import('@/lib/systemLogger').catch(() => ({}));

        if (typeof logSystemEvent === 'function') {
            await logSystemEvent(type, message, metadata);
        }
    } catch (e) {
        console.error('[SAFE_LOG_FAIL]', e.message);
    }
}
