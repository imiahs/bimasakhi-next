/**
 * TRIGGER MAP — Routes business events to executives via QStash.
 * Static mapping first. DB overrides loaded at runtime.
 * Event → Executive → QStash endpoint
 */

const STATIC_TRIGGERS = {
    lead_created: {
        executive: 'cmo',
        endpoint: '/api/workers/lead-sync',
        action: 'queue_job',
    },
    contact_created: {
        executive: 'coo',
        endpoint: '/api/workers/contact-sync',
        action: 'queue_job',
    },
    pagegen_requested: {
        executive: 'coo',
        endpoint: '/api/jobs/pagegen',
        action: 'queue_job',
    },
    lead_hot: {
        executive: 'cso',
        endpoint: '/api/jobs/followup-trigger',
        action: 'queue_job',
    },
    lead_scored: {
        executive: 'cso',
        endpoint: null,
        action: 'log_only',
    },
    lead_routed: {
        executive: 'cso',
        endpoint: null,
        action: 'log_only',
    },
    system_error: {
        executive: 'cto',
        endpoint: null,
        action: 'log_only',
    },
    agent_applied: {
        executive: 'chro',
        endpoint: null,
        action: 'log_only',
    },
};

export function getTrigger(eventName) {
    return STATIC_TRIGGERS[eventName] || null;
}

export function getAllTriggers() {
    return { ...STATIC_TRIGGERS };
}
