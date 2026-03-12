import { getServiceSupabase } from '@/utils/supabase';

/**
 * Universal Error Logger for observability tracking.
 * Securely writes directly to Supabase regardless of client sessions.
 */
export const logError = async (component, errorMessage, errorObj = null, metadata = {}) => {
    try {
        const supabase = getServiceSupabase();

        let stackTrace = null;
        if (errorObj && errorObj instanceof Error) {
            stackTrace = errorObj.stack;
        } else if (typeof errorObj === 'string') {
            stackTrace = errorObj;
        }

        await supabase.from('system_runtime_errors').insert({
            component,
            error_message: errorMessage || 'Unknown Execution Error', // Keeping original errorMessage logic
            stack_trace: stackTrace, // Keeping original stackTrace logic
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString()
            }
        });

        // Ensure the error bubbles to Vercel runtime logs regardless of DB status
        console.error(`[${component}] ${errorMessage}`, errorObj || '');
    } catch (criticalFailure) {
        console.error("FATAL: Observability Logger itself crashed.", criticalFailure);
    }
};
