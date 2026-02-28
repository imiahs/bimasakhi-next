import React from 'react';
import { logger } from '../../../utils/logger';
// Dynamic Section Components (will move to ../components/dynamic/ in Stage 3)
import Hero from '../components/dynamic/Hero';
import TrustSignals from '../components/dynamic/TrustSignals';
import HowItWorks from '../components/dynamic/HowItWorks';
import IncomeBlock from '../components/dynamic/IncomeBlock';
import Benefits from '../components/dynamic/Benefits';
import Testimonials from '../components/dynamic/Testimonials';
import Gallery from '../components/dynamic/Gallery';
import FAQ from '../components/dynamic/FAQ';
// Feature Components (stay in features/leads/)
import ApplyForm from '../../leads/ApplyForm';
import EligibilityBlock from '../../leads/EligibilityBlock';
import { validateSection } from '../../../config/sectionSchemas';

// Component Map: Maps string 'type' from JSON to React Component
const COMPONENT_MAP = {
    'HeroSection': Hero,
    'TrustBlock': TrustSignals,
    'TrustSignals': TrustSignals,
    'HowItWorks': HowItWorks,
    'ApplyFormBlock': ApplyForm,
    'BenefitsBlock': Benefits,
    'IncomeRealityBlock': IncomeBlock,
    'EligibilityBlock': EligibilityBlock,
    'TestimonialsBlock': Testimonials,
    'GalleryBlock': Gallery,
    'FAQBlock': FAQ
};

// Error Boundary for individual sections
class SectionErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        logger.error('SectionRenderer', 'Section Render Error', { error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || null;
        }
        return this.props.children;
    }
}

const SectionRenderer = ({ sections = [] }) => {
    // GUARD 1: Array Check
    if (!Array.isArray(sections) || sections.length === 0) {
        return null;
    }

    return (
        <div className="sections-container">
            {sections.map((section, index) => {
                // GUARD 2: Structural Validation
                if (!validateSection(section)) {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn(`Invalid section config at index ${index}`, section);
                    }
                    return null;
                }

                const Component = COMPONENT_MAP[section.type];

                // GUARD 3: Component Existence
                if (!Component) {
                    console.warn(`Unknown section type: ${section.type}`);
                    return null;
                }

                // GUARD 4: Per-Section Safety
                return (
                    <SectionErrorBoundary key={section.id || index}>
                        <div id={section.id} className={`section-wrapper section-${section.type.toLowerCase()}`}>
                            <Component {...section.props} />
                        </div>
                    </SectionErrorBoundary>
                );
            })}
        </div>
    );
};

export default SectionRenderer;
