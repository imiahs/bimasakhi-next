/**
 * Analytics Service (Phase 2 Data Trust)
 * Server-authoritative telemetry data plane.
 */

class AnalyticsService {
    constructor() {
        this.initialized = false;
        this.sessionId = null;
        this.gaId = null;
        this.gtmId = null;
    }

    /**
     * Generate or retrieve stable session identity.
     * "Client proposes identity, server confirms identity."
     */
    _getSessionId() {
        if (this.sessionId) return this.sessionId;
        
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                let sid = window.localStorage.getItem('bimasakhi_session_id');
                if (!sid) {
                    sid = crypto.randomUUID ? crypto.randomUUID() : 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
                    window.localStorage.setItem('bimasakhi_session_id', sid);
                }
                this.sessionId = sid;
                return sid;
            }
        } catch (e) {
            // Fallback for strict privacy modes
            return crypto.randomUUID();
        }
        return crypto.randomUUID();
    }

    initialize(config) {
        if (this.initialized) return;
        this.initialized = true;

        this._getSessionId(); // Ensure session is ready

        if (config && config.isAnalyticsEnabled) {
            this.gaId = config.gaMeasurementId;
            this.gtmId = config.gtmContainerId;

            if (this.gaId) this._injectGA4(this.gaId);
            if (this.gtmId) this._injectGTM(this.gtmId);
        }
    }

    _injectGA4(measurementId) {
        try {
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
            document.head.appendChild(script);

            window.dataLayer = window.dataLayer || [];
            function gtag() { window.dataLayer.push(arguments); }
            gtag('js', new Date());
            gtag('config', measurementId);

            this.gtag = gtag;
        } catch (e) { }
    }

    _injectGTM(containerId) {
        try {
            (function (w, d, s, l, i) {
                w[l] = w[l] || []; w[l].push({
                    'gtm.start': new Date().getTime(), event: 'gtm.js'
                }); var f = d.getElementsByTagName(s)[0],
                    j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : ''; j.async = true; j.src =
                        'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
            })(window, document, 'script', 'dataLayer', containerId);
        } catch (e) { }
    }

    /**
     * Dispatch event mapping to strict Event Contract.
     * @param {string} eventType 
     * @param {string} eventName 
     * @param {Object} payload 
     */
    dispatch(eventType, eventName, payload = {}) {
        if (!this.initialized) return;

        const sessionId = this._getSessionId();

        // 1. Third-party Sync (if enabled)
        try {
            if (this.gtag) this.gtag('event', eventName, payload);
            if (window.dataLayer) {
                window.dataLayer.push({ event: eventName, ...payload });
            }
        } catch (e) {}

        // 2. Primary Data Trust Ingestion (Mandatory)
        const eventPayload = {
            session_id: sessionId,
            event_type: eventType,
            event_name: eventName,
            payload
        };

        const strPayload = JSON.stringify(eventPayload);

        // Network strategy: beacon > fetch(keepalive)
        try {
            if (navigator.sendBeacon) {
                const blob = new Blob([strPayload], { type: 'text/plain' });
                const success = navigator.sendBeacon('/api/events', blob);
                if (success) return; // Dispatched successfully
            }
            
            // Fallback
            fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: strPayload,
                keepalive: true
            }).catch(() => { /* Silent network drop */ });
        } catch (e) {
            // Absolute silence on frontend UX errors
        }
    }

    // Helper syntax wrappers for legacy code or ease of use
    pageView(path) {
        this.dispatch('page_view', path, { route: path });
    }

    track(eventName, params = {}) {
        // Default to cta_clicked if it's a generic track action to map to contract unless overridden
        const type = params._event_type || 'cta_clicked';
        const cleanParams = { ...params };
        delete cleanParams._event_type;
        
        this.dispatch(type, eventName, cleanParams);
    }
}

export const analytics = new AnalyticsService();
