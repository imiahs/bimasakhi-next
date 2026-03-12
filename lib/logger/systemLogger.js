// lib/logger/systemLogger.js
import { supabase } from '../supabase.js';

export const systemLogger = {
    logError: async (component, message, stackTrace = '') => {
        console.error(`[${component} ERROR]: ${message}\n${stackTrace}`);
        if (process.env.SUPABASE_ENABLED === 'true') {
            try {
                await supabase.from('system_runtime_errors').insert({
                    error_type: 'SYSTEM_ERROR',
                    component,
                    error_message: message,
                    stack_trace: stackTrace,
                    resolved: false
                });
            } catch (err) {
                console.error('Failed to write to system_errors table:', err);
            }
        }
    },

    logWarning: async (component, message) => {
        console.warn(`[${component} WARN]: ${message}`);
        if (process.env.SUPABASE_ENABLED === 'true') {
            try {
                await supabase.from('system_runtime_errors').insert({
                    error_type: 'SYSTEM_WARNING',
                    component,
                    message,
                    stack_trace: '',
                    resolved: false
                });
            } catch (err) {
                console.error('Failed to log warning to DB:', err);
            }
        }
    },

    logInfo: (component, message) => {
        console.log(`[${component} INFO]: ${message}`);
        // Info logs are usually kept in stdout unless critical for observability matrices
    }
};
