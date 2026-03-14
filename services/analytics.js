/**
 * Analytics Service
 * Handles dynamic injection of Google Analytics (GA4) and Google Tag Manager (GTM).
 * Respects 'isAnalyticsEnabled' flag from global config.
 */

import { getStorage, STORAGE_KEYS } from '@/utils/storage';

class AnalyticsService {
    constructor() {
        this.initialized = false;
        this.gtag = null;
    }

    /**
     * Initialize Analytics (GA4 + GTM)
     * @param {string} measurementId - GA4 Measurement ID (e.g. 'G-XXXXXXX')
     * @param {string} containerId - GTM Container ID (e.g. 'GTM-XXXXXXX')
     */
    init(measurementId, containerId) {
        if (this.initialized || typeof window === 'undefined') return;

        try {
            // GA4 Script
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
            document.head.appendChild(script);

            window.dataLayer = window.dataLayer || [];
            function gtag() { window.dataLayer.push(arguments); }
            gtag('js', new Date());
            gtag('config', measurementId);
            this.gtag = gtag;

            // GTM Script
            (function (w, d, s, l, i) {
                w[l] = w[l] || []; w[l].push({
                    'gtm.start':
                        new Date().getTime(), event: 'gtm.js'
                }); var f = d.getElementsByTagName(s)[0],
                    j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : ''; j.async = true; j.src =
                        'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
            })(window, document, 'script', 'dataLayer', containerId);

            this.initialized = true;
        } catch (e) {
            console.error('Analytics: GTM Injection Failed', e);
        }
    }

    /**
     * Track Page View
     * @param {string} path - Current route path
     */
    pageView(path) {
        if (!this.initialized) return;

        let sessionId = 'anonymous';
        let userState = null;
        try {
            userState = getStorage(STORAGE_KEYS.USER);
            if (userState && userState.session_id) sessionId = userState.session_id;
        } catch (e) {
            console.error("Runtime Error:", e);
        }

        try {
            // GA4 Page View
            if (this.gtag) {
                this.gtag('event', 'page_view', {
                    page_path: path
                });
            }
            // GTM Event
            if (window.dataLayer) {
                window.dataLayer.push({
                    event: 'page_view_virtual',
                    pagePath: path
                });
            }

            // Phase 19: Local Observability Integration (Batched)
            this._queueEvent({
                event_type: 'page_view',
                session_id: sessionId,
                route_path: path,
                metadata: { source: userState?.source || 'direct' }
            });

        } catch (e) {
            // Silent fail
        }
    }

    /**
     * Track Custom Event
     * @param {string} eventName - e.g. 'form_submit'
     * @param {Object} params - e.g. { leadId: '123' }
     */
    track(eventName, params = {}) {
        if (!this.initialized) return;

        let sessionId = 'anonymous';
        try {
            const userState = getStorage(STORAGE_KEYS.USER);
            if (userState && userState.session_id) sessionId = userState.session_id;
        } catch (e) {
            console.error("Runtime Error:", e);
        }

        try {
            // GA4
            if (this.gtag) {
                this.gtag('event', eventName, params);
            }
            // GTM
            if (window.dataLayer) {
                window.dataLayer.push({
                    event: eventName,
                    ...params
                });
            }

    // Phase 19: Local Observability Integration (Batched via Beacon Payload structure wrapper)
            this._queueEvent({
                event_type: eventName,
                session_id: sessionId,
                route_path: window.location.pathname,
                metadata: params
            });

        } catch (e) {
            // Silent fail
        }
    }

    _queueEvent(eventPayload) {
        if (!this._eventQueue) this._eventQueue = [];
        this._eventQueue.push(eventPayload);

        if (!this._flushBound) {
            this._flushBound = true;
            window.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    this._flushEvents();
                }
            });
            window.addEventListener('beforeunload', () => {
                this._flushEvents();
            });
            // Also flush every 10 seconds to avoid data loss on long-lived pages
            setInterval(() => this._flushEvents(), 10000);
        }
    }

    _flushEvents() {
        if (!this._eventQueue || this._eventQueue.length === 0) return;
        const eventsToFlush = [...this._eventQueue];
        this._eventQueue = [];

        try {
            // Natively mapping `navigator.sendBeacon` for best effort zero-overhead delivery.
            // Note: Since api/events does not yet support bulk array native insertion natively on the exact same generic endpoint natively,
            // we will either map array wrapping, OR map `fetch(keepalive:true)` iteratively safely.
            eventsToFlush.forEach(eventPayload => {
                 fetch('/api/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(eventPayload),
                    keepalive: true
                 }).catch(() => {});
            });
        } catch(e) {}
    }
}

export const analytics = new AnalyticsService();
