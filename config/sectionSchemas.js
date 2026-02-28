// Defines the schema for editable props for each section type
// This drives the Admin UI Forms

export const SECTION_SCHEMAS = {
    'HeroSection': {
        name: 'Hero Section',
        fields: [
            { name: 'title', label: 'Headline', type: 'text', default: 'Become a LIC Agent' },
            { name: 'subtitle', label: 'Sub-headline', type: 'text', default: 'Government Backed Commission Career' },
            { name: 'ctaText', label: 'Button Text', type: 'text', default: 'Apply Now' },
            { name: 'ctaLink', label: 'Button Link', type: 'text', default: '/apply' }
        ]
    },
    'TrustBlock': {
        name: 'Trust / Benefits Block',
        fields: [
            { name: 'title', label: 'Section Title', type: 'text', default: 'Why Join Us?' }
            // Items are currently hardcoded or array-based. 
            // For v1, we only edit the title to keep it simple as requested.
        ]
    },
    'ApplyFormBlock': {
        name: 'Application Form',
        fields: [
            // No props needed for the form logic itself yet, maybe title
            { name: 'title', label: 'Form Title (Optional)', type: 'text', default: '' }
        ]
    },
    'IncomeRealityBlock': {
        name: 'Income Potential',
        fields: [
            { name: 'title', label: 'Title', type: 'text', default: 'Real Income Potential' }
        ]
    },
    'TrustSignals': {
        name: 'Trust Signals',
        fields: [
            { name: 'title', label: 'Section Title', type: 'text', default: 'Why is Bima Sakhi Trusted?' }
        ]
    },
    'HowItWorks': {
        name: 'How It Works',
        fields: [
            { name: 'title', label: 'Section Title', type: 'text', default: 'How to Become Bima Sakhi?' }
        ]
    },
    'BenefitsBlock': {
        name: 'Benefits',
        fields: [
            { name: 'title', label: 'Section Title', type: 'text', default: 'Benefits of Becoming Bima Sakhi' }
        ]
    },
    'EligibilityBlock': {
        name: 'Eligibility Check',
        fields: [
            { name: 'title', label: 'Section Title', type: 'text', default: 'Check Eligibility' }
        ]
    },
    'TestimonialsBlock': {
        name: 'Testimonials',
        fields: [
            { name: 'title', label: 'Section Title', type: 'text', default: 'Real Stories of Women' }
        ]
    },
    'GalleryBlock': {
        name: 'Gallery',
        fields: [
            { name: 'title', label: 'Section Title', type: 'text', default: 'LIC Lady Agents – Glimpses' }
        ]
    },
    'FAQBlock': {
        name: 'FAQ',
        fields: [
            { name: 'title', label: 'Section Title', type: 'text', default: 'Frequently Asked Questions' }
        ]
    }
};

export const AVAILABLE_SECTIONS = [
    { type: 'HeroSection', label: 'Hero Section' },
    { type: 'TrustBlock', label: 'Trust & Benefits' },
    { type: 'TrustSignals', label: 'Trust Signals' },
    { type: 'HowItWorks', label: 'How It Works' },
    { type: 'ApplyFormBlock', label: 'Application Form' },
    { type: 'BenefitsBlock', label: 'Benefits' },
    { type: 'IncomeRealityBlock', label: 'Income Table' },
    { type: 'EligibilityBlock', label: 'Eligibility Check' },
    { type: 'TestimonialsBlock', label: 'Testimonials' },
    { type: 'GalleryBlock', label: 'Gallery' },
    { type: 'FAQBlock', label: 'FAQ' }
];

// LIGHTWEIGHT VALIDATOR (Engine Safety)
export function validateSection(section) {
    if (!section || typeof section !== 'object') return false;
    if (!section.type) return false;
    // Check if type is known in schema registry
    if (!SECTION_SCHEMAS[section.type]) return false;
    return true;
}
