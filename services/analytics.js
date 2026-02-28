/**
 * Analytics Service (Phase 5.6)
 * Handles dynamic injection of Google Analytics (GA4) and Google Tag Manager (GTM).
 * Respects 'isAnalyticsEnabled' flag from global config.
 */

class AnalyticsService {
    constructor() {
        this.initialized = false;
        this.gaId = null;
        this.gtmId = null;
    }

    /**
     * Initialize analytics with config from backend
     * @param {Object} config - Global config object
     */
    initialize(config) {
        if (this.initialized) return;
        if (!config || !config.isAnalyticsEnabled) {
            console.log('Analytics: Disabled or Config Missing');
            return;
        }

        this.gaId = config.gaMeasurementId;
        this.gtmId = config.gtmContainerId;

        // Inject GA4
        if (this.gaId) {
            this._injectGA4(this.gaId);
        }

        // Inject GTM
        if (this.gtmId) {
            this._injectGTM(this.gtmId);
        }

        this.initialized = true;
        console.log('Analytics: Initialized', { ga: this.gaId, gtm: this.gtmId });
    }

    _injectGA4(measurementId) {
        try {
            // 1. Load Script
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
            document.head.appendChild(script);

            // 2. Init DataLayer
            window.dataLayer = window.dataLayer || [];
            function gtag() { window.dataLayer.push(arguments); }
            gtag('js', new Date());
            gtag('config', measurementId);

            this.gtag = gtag;
        } catch (e) {
            console.error('Analytics: GA4 Injection Failed', e);
        }
    }

    _injectGTM(containerId) {
        try {
            // GTM Script
            (function (w, d, s, l, i) {
                w[l] = w[l] || []; w[l].push({
                    'gtm.start':
                        new Date().getTime(), event: 'gtm.js'
                }); var f = d.getElementsByTagName(s)[0],
                    j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : ''; j.async = true; j.src =
                        'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
            })(window, document, 'script', 'dataLayer', containerId);
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
        } catch (e) {
            // Silent fail
        }
    }
}

export const analytics = new AnalyticsService();
