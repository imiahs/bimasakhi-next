// lib/logger/systemLogger.js
import { supabase } from '../supabase';

export const systemLogger = {
    logError: async (component, message, stackTrace = '') => {
        console.error(`[${component} ERROR]: ${message}\n${stackTrace}`);
        if (process.env.SUPABASE_ENABLED === 'true') {
            try {
                await supabase.from('system_errors').insert({
                    error_type: 'SYSTEM_ERROR',
                    component,
                    message,
                    stack_trace: stackTrace
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
                await supabase.from('system_errors').insert({
                    error_type: 'SYSTEM_WARNING',
                    component,
                    message,
                    stack_trace: ''
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
