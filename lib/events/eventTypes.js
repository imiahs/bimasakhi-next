/**
 * EVENT TYPES — All business events in the system.
 * Not telemetry. Business events only.
 * Every event has: name, requires_ai, requires_queue, requires_followup, executive, layer
 */

export const EventTypes = {
    // Lead Pipeline
    LEAD_CREATED:       { name: 'lead_created',       executive: 'cmo', requires_queue: false, requires_ai: false, requires_followup: false, layer: 'queue' },
    LEAD_SCORED:        { name: 'lead_scored',         executive: 'cso', requires_queue: false, requires_ai: false, requires_followup: false, layer: 'executive' },
    LEAD_ROUTED:        { name: 'lead_routed',         executive: 'cso', requires_queue: false, requires_ai: false, requires_followup: false, layer: 'executive' },
    LEAD_HOT:           { name: 'lead_hot',            executive: 'cso', requires_queue: true,  requires_ai: false, requires_followup: true,  layer: 'queue' },
    LEAD_CONVERTED:     { name: 'lead_converted',      executive: 'cfo', requires_queue: false, requires_ai: false, requires_followup: false, layer: 'executive' },

    // Contact Pipeline
    CONTACT_CREATED:    { name: 'contact_created',     executive: 'coo', requires_queue: false, requires_ai: false, requires_followup: false, layer: 'queue' },

    // Content Pipeline
    PAGEGEN_REQUESTED:  { name: 'pagegen_requested',   executive: 'coo', requires_queue: true,  requires_ai: true,  requires_followup: false, layer: 'queue' },
    CONTENT_GENERATED:  { name: 'content_generated',   executive: 'cmo', requires_queue: false, requires_ai: false, requires_followup: false, layer: 'executive' },

    // System
    SYSTEM_ERROR:       { name: 'system_error',        executive: 'cto', requires_queue: false, requires_ai: false, requires_followup: false, layer: 'executive' },
    SYSTEM_ALERT:       { name: 'system_alert',        executive: 'cto', requires_queue: false, requires_ai: false, requires_followup: false, layer: 'executive' },

    // Agent/HR
    AGENT_APPLIED:      { name: 'agent_applied',       executive: 'chro', requires_queue: false, requires_ai: false, requires_followup: false, layer: 'executive' },

    // Revenue
    PAYMENT_RECEIVED:   { name: 'payment_received',    executive: 'cfo', requires_queue: false, requires_ai: false, requires_followup: false, layer: 'executive' },
};

export function getEventType(name) {
    return Object.values(EventTypes).find(e => e.name === name) || null;
}

export function getEventNames() {
    return Object.values(EventTypes).map(e => e.name);
}
