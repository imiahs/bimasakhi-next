'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import '@/styles/Resources.css';

const ResourcesIndex = ({ initialResources = [] }) => {
    const [selectedResource, setSelectedResource] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [downloadReady, setDownloadReady] = useState(null); // stores the unlocked resource ID
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        city: ''
    });

    const handleOpenModal = (resource) => {
        // Bypass gate if gated rules turned off
        if (!resource.requires_lead_form || downloadReady === resource.id) {
            triggerDownload(resource.file_url, resource.title);
            return;
        }
        setSelectedResource(resource);
        setError('');
    };

    const handleCloseModal = () => {
        setSelectedResource(null);
        setError('');
    };

    const triggerDownload = (url, fallbackName) => {
        // Task 4: Resource Download Tracking
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: 'resource_download',
            resource_name: fallbackName,
            page: window.location.pathname,
            source: 'resources_page'
        });

        const a = document.createElement('a');
        a.href = url;
        a.download = url.split('/').pop() || fallbackName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            // Create full payload masking missing requirements API needs
            const payload = {
                name: formData.name,
                mobile: formData.mobile,
                city: formData.city,
                email: 'download@bimasakhi.com', // Masked default
                occupation: 'Resource Downloader', // Masked default
                pincode: '110001', // Masked default
                source: 'Resource Download',
                medium: 'Organic',
                campaign: selectedResource.id,
                visitedPages: ['/resources'],
                // Tasks 2 & 3: Lead Attribution
                lead_source_page: window.location.pathname,
                lead_source_type: 'resources'
            };

            const res = await fetch('/api/crm/create-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok || data.duplicate) {
                // Task 8: Resource Download Analytics
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                    event: 'resource_unlocked',
                    resource_name: selectedResource.title,
                    lead_id: data.lead_id || 'unknown'
                });

                // Success or Duplicate (we still allow download if they've registered before)
                setDownloadReady(selectedResource.id);
                triggerDownload(selectedResource.file_url, selectedResource.title);

                // Clear modal after short delay
                setTimeout(() => {
                    handleCloseModal();
                }, 1500);
            } else {
                setError(data.error || 'Failed to unlock resource. Please check your details.');
            }
        } catch (err) {
            setError('An error occurred. Please try again later.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="resources-container">
            <section className="resources-hero">
                <div className="container">
                    <h1>Free LIC Agent Resources</h1>
                    <p className="subtitle">Download our expertly crafted study guides, sales scripts, and commission charts to accelerate your Bima Sakhi journey.</p>
                </div>
            </section>

            <section className="resources-grid-section container py-12">
                <div className="resources-grid">
                    {initialResources.map(resource => (
                        <div className="resource-card" key={resource.id}>
                            <div className="resource-icon">⭐</div>
                            <h3>{resource.title}</h3>
                            <p>{resource.description}</p>

                            <button
                                className={`download-btn ${downloadReady === resource.id ? 'unlocked' : ''}`}
                                onClick={() => handleOpenModal(resource)}
                            >
                                {downloadReady === resource.id ? 'Download Again ↓' : (resource.requires_lead_form ? 'Unlock Free Guide ↓' : 'Download Now ↓')}
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Conversion CTA */}
            <section className="resources-cta container text-center" style={{ padding: '60px 20px', backgroundColor: '#fafafa', borderRadius: '16px', marginBottom: '40px' }}>
                <h2>Ready to put these resources to work?</h2>
                <p className="subtitle" style={{ marginTop: '16px', marginBottom: '32px', maxWidth: '600px', mx: 'auto', display: 'inline-block' }}>Apply for the LIC Bima Sakhi program and start earning with the strategies you just downloaded.</p>
                <div>
                    <Link href="/apply">
                        <Button variant="primary" size="large">Apply Now to Become an Agent →</Button>
                    </Link>
                </div>
            </section>

            {/* Gated Content Modal */}
            {selectedResource && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="modal-close" onClick={handleCloseModal}>&times;</button>

                        <div className="modal-header">
                            <span className="modal-icon">⭐</span>
                            <h2>Unlock Your Free Resource</h2>
                            <p>Enter your details below to instantly download the <strong>{selectedResource.title}</strong>.</p>
                        </div>

                        {downloadReady === selectedResource.id ? (
                            <div className="modal-success text-center py-6">
                                <div className="text-4xl mb-4">✅</div>
                                <h3 className="text-xl font-bold mb-2">Resource Unlocked!</h3>
                                <p>Your download should start automatically.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="gated-form">
                                {error && <div className="error-message">{error}</div>}

                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Enter your name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Mobile Number (10 digits)</label>
                                    <input
                                        type="tel"
                                        required
                                        pattern="^[6-9][0-9]{9}$"
                                        maxLength="10"
                                        value={formData.mobile}
                                        onChange={e => {
                                            const numericVal = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            setFormData({ ...formData, mobile: numericVal });
                                        }}
                                        placeholder="Enter your mobile"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>City</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.city}
                                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                                        placeholder="Enter your city"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-full mt-4"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Unlocking...' : 'Unlock & Download Now'}
                                </Button>

                                <p className="text-xs text-center text-gray-500 mt-4">
                                    By downloading, you agree to receive guidance calls regarding the Bima Sakhi opportunity.
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResourcesIndex;
