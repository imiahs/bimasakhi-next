import { normalizeMobile } from '../leads/index.js';

export function validateContactPayload(payload) {
    const { name, mobile, email, message, reason } = payload;

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedReason = typeof reason === 'string' && reason.trim()
        ? reason.trim()
        : 'Callback Request';

    if (!name || !mobile || !normalizedEmail || !message) {
        return { valid: false, error: "All fields are required" };
    }

    const normalizedMobile = normalizeMobile(mobile);

    return { 
        valid: true, 
        normalized: {
            ...payload,
            mobile: normalizedMobile,
            email: normalizedEmail,
            reason: normalizedReason
        }
    };
}
