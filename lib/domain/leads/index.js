export function normalizeMobile(mobile = '') {
    const cleaned = mobile.toString().replace(/\D/g, '');
    return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
}

export function validateLeadPayload(payload) {
    let { name, mobile, email, city, pincode, source } = payload;
    
    const normalizedMobile = normalizeMobile(mobile);
    const safeCity = city || 'Unknown';
    const safeSource = source || 'Website';

    if (!name || !normalizedMobile || !email || !pincode) {
        return { valid: false, error: 'Missing required fields' };
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(normalizedMobile)) {
        return { valid: false, error: 'Invalid Indian mobile number' };
    }

    if (!safeSource) {
        return { valid: false, error: 'Missing mandatory metadata: source' };
    }

    return { 
        valid: true, 
        normalized: {
            ...payload,
            mobile: normalizedMobile,
            city: safeCity,
            source: safeSource,
            occupation: payload.occupation || 'Not Specified'
        }
    };
}
