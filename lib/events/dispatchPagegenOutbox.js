import { enqueuePageGeneration } from '@/lib/queue/publisher';
import { markDispatched, markFailed } from '@/lib/events/eventStore';

export async function dispatchPagegenOutbox(eventStoreId, payload, partialResult = null) {
    try {
        const result = await enqueuePageGeneration(payload);
        await markDispatched(eventStoreId, result?.messageId || null);
        return { success: true, messageId: result?.messageId || null };
    } catch (error) {
        await markFailed(eventStoreId, error, partialResult);
        return { success: false, error };
    }
}