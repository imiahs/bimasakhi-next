const FOUNDATION_CAPABILITIES = Object.freeze({
    runtimeCompatible: true,
    hydrationSafe: true,
    generatedRuntimeSafe: true,
    rollbackSafe: true,
    responsiveSafe: true,
    reusableSafe: true,
    executionSafe: true,
    deploySafe: true,
});

const CANONICAL_CONTRACT_VERSION = '2026-05-v1';
const PERSISTENCE_SHADOW_KEY = '__canonical_shadow';
const PERSISTENCE_META_KEY = '__persistence';

function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isCanonicalBlockContract(value) {
    if (!isPlainObject(value)) return false;

    return (
        (Object.prototype.hasOwnProperty.call(value, 'block_type') ||
            Object.prototype.hasOwnProperty.call(value, 'variant') ||
            Object.prototype.hasOwnProperty.call(value, 'version')) &&
        (Object.prototype.hasOwnProperty.call(value, 'props') ||
            Object.prototype.hasOwnProperty.call(value, 'cta') ||
            Object.prototype.hasOwnProperty.call(value, 'assets'))
    );
}

function stripPersistenceMetadata(value) {
    const source = isPlainObject(value) ? value : {};
    const next = { ...source };
    delete next[PERSISTENCE_SHADOW_KEY];
    delete next[PERSISTENCE_META_KEY];
    return next;
}

function normalizeString(value, fallback = '') {
    if (value === null || value === undefined) return fallback;
    const normalized = String(value).trim();
    return normalized || fallback;
}

function normalizeBoolean(value, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        if (value === 'true') return true;
        if (value === 'false') return false;
    }
    return fallback;
}

function normalizeHref(value, fallback) {
    const normalized = normalizeString(value, fallback);
    if (!normalized) return fallback;
    if (normalized.startsWith('/') || normalized.startsWith('http://') || normalized.startsWith('https://')) {
        return normalized;
    }
    return fallback;
}

function normalizeArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (_error) {
            return [];
        }
    }
    return [];
}

function parseEditorJsonValue(value, field, blockLabel) {
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();
    if (!trimmed) {
        if (field.jsonShape === 'array') return [];
        if (field.jsonShape === 'object') return {};
        return null;
    }

    let parsed;
    try {
        parsed = JSON.parse(trimmed);
    } catch (_error) {
        throw new Error(`${blockLabel} ${field.label} must be valid JSON.`);
    }

    if (field.jsonShape === 'array' && !Array.isArray(parsed)) {
        throw new Error(`${blockLabel} ${field.label} must be a JSON array.`);
    }

    if (field.jsonShape === 'object' && (Array.isArray(parsed) || !parsed || typeof parsed !== 'object')) {
        throw new Error(`${blockLabel} ${field.label} must be a JSON object.`);
    }

    return parsed;
}

function normalizeStructuredItems(value, mapItem, fallbackItems) {
    const normalized = normalizeArray(value)
        .map((item) => mapItem(item))
        .filter(Boolean);

    return normalized.length > 0 ? normalized : fallbackItems;
}

function normalizeBenefitItem(item) {
    if (!item || typeof item !== 'object') return null;

    const title = normalizeString(item.title || item.label || item.heading);
    const description = normalizeString(item.description || item.copy || item.text);
    const icon = normalizeString(item.icon || item.emoji, '✨');

    if (!title && !description) return null;

    return {
        title: title || 'Benefit',
        description: description || 'Structured benefit copy pending.',
        icon,
    };
}

function normalizeFaqItem(item) {
    if (!item || typeof item !== 'object') return null;

    const question = normalizeString(item.question || item.title || item.q);
    const answer = normalizeString(item.answer || item.description || item.a);

    if (!question && !answer) return null;

    return {
        question: question || 'Question',
        answer: answer || 'Answer pending.',
    };
}

function normalizeHighlightItem(item) {
    if (!item || typeof item !== 'object') return null;

    const text = normalizeString(item.text || item.title || item.label || item.description);
    if (!text) return null;

    return {
        text,
    };
}

function buildCanonicalContractMetadata(definition) {
    if (!definition) return {};

    return {
        displayName: definition.displayName,
        classification: definition.classification,
        durability: definition.durability,
        surfaces: definition.surfaces,
        editorMode: definition.editorMode,
    };
}

function adaptLegacyBlockDataFromCanonical(blockType, canonicalData = {}) {
    const mergedInput = {
        ...(isPlainObject(canonicalData.props) ? canonicalData.props : {}),
        ...(isPlainObject(canonicalData.cta) ? canonicalData.cta : {}),
        ...(isPlainObject(canonicalData.assets) ? canonicalData.assets : {}),
    };

    const definition = getBlockDefinition(blockType);
    return definition ? normalizeBlockData(blockType, mergedInput) : mergedInput;
}

function readBlockPersistenceState(blockType, inputData = {}) {
    const source = isPlainObject(inputData) ? inputData : {};

    if (isCanonicalBlockContract(source)) {
        return {
            mode: 'canonical_projection',
            legacyData: adaptLegacyBlockDataFromCanonical(blockType, source),
            hasShadow: false,
            shadowData: source,
        };
    }

    const shadowData = isCanonicalBlockContract(source[PERSISTENCE_SHADOW_KEY]) ? source[PERSISTENCE_SHADOW_KEY] : null;
    const legacyData = stripPersistenceMetadata(source);

    if (Object.keys(legacyData).length > 0) {
        return {
            mode: shadowData ? 'legacy_with_shadow' : 'legacy_persistence',
            legacyData,
            hasShadow: !!shadowData,
            shadowData,
        };
    }

    if (shadowData) {
        return {
            mode: 'shadow_only',
            legacyData: adaptLegacyBlockDataFromCanonical(blockType, shadowData),
            hasShadow: true,
            shadowData,
        };
    }

    return {
        mode: 'legacy_persistence',
        legacyData,
        hasShadow: false,
        shadowData: null,
    };
}

function buildBlockPersistenceMetadata(definition, readState) {
    const classifications = new Set(['CANONICAL_PROJECTION', 'COMPATIBILITY_ADAPTER', 'REGISTRY_VISIBLE']);

    if (readState.mode !== 'canonical_projection') {
        classifications.add('LEGACY_PERSISTENCE');
    }

    if (definition) {
        classifications.add('DUAL_READ_SAFE');
        classifications.add('DUAL_WRITE_SAFE');
        classifications.add('PREVIEW_SAFE');
        classifications.add('ROLLBACK_SAFE');
        classifications.add('HYDRATION_SAFE');
    } else {
        classifications.add('PARTIALLY_OPERATIONAL');
        if (readState.hasShadow || readState.mode === 'canonical_projection') {
            classifications.add('DUAL_READ_SAFE');
        }
    }

    return {
        source_mode: readState.mode,
        shadow_key: readState.hasShadow ? PERSISTENCE_SHADOW_KEY : null,
        shadow_write_mode: 'legacy_plus_canonical_shadow',
        canonical_version: CANONICAL_CONTRACT_VERSION,
        classifications: Array.from(classifications),
    };
}

export function normalizeBlockData(blockType, inputData = {}) {
    const { legacyData } = readBlockPersistenceState(blockType, inputData);
    const source = legacyData;

    switch (blockType) {
        case 'HeroBlock':
            return {
                eyebrow: normalizeString(source.eyebrow),
                headline: normalizeString(source.headline, 'Become a Bima Sakhi Today'),
                subheadline: normalizeString(source.subheadline, 'Join an elite network of women in insurance. Secure your financial independence without disrupting your lifestyle.'),
                ctaMode: normalizeString(source.ctaMode, normalizeBoolean(source.useSmartCTA, true) ? 'smart' : 'link'),
                primaryCtaLabel: normalizeString(source.primaryCtaLabel || source.buttonText || source.label, 'Apply Now'),
                primaryCtaHref: normalizeHref(source.primaryCtaHref || source.href, '/apply'),
                secondaryCtaLabel: normalizeString(source.secondaryCtaLabel, 'Learn More'),
                secondaryCtaHref: normalizeHref(source.secondaryCtaHref, '/why'),
                mediaSrc: normalizeHref(source.mediaSrc || source.imageSrc || source.backgroundImage, ''),
                mediaAlt: normalizeString(source.mediaAlt || source.imageAlt, 'Bima Sakhi visual'),
            };
        case 'ContentBlock':
            return {
                heading: normalizeString(source.heading),
                html: normalizeString(source.html, '<p>Default Content Block... populate this via Admin Editor.</p>'),
            };
        case 'BenefitsBlock':
            return {
                title: normalizeString(source.title, 'Why Join Bima Sakhi?'),
                subtitle: normalizeString(source.subtitle, 'Empowering women across India with financial independence.'),
                items: normalizeStructuredItems(source.items || source.benefits || source.cards, normalizeBenefitItem, [
                    { title: 'Zero Investment', description: 'Secure a stable income dynamically integrated around your schedule.', icon: '✨' },
                    { title: 'Flexible Timing', description: 'Flexible work that can coexist with home and family responsibilities.', icon: '⏰' },
                    { title: 'Unlimited Earnings', description: 'Performance-linked earning potential with long-term client growth.', icon: '📈' },
                ]),
            };
        case 'AuthorityBlock':
            return {
                eyebrow: normalizeString(source.eyebrow, 'Trusted Guidance'),
                title: normalizeString(source.title, 'Built on structured guidance, not guesswork.'),
                body: normalizeString(source.body || source.description, 'Use this block for authority, trust, and policy-safe confidence framing.'),
                highlights: normalizeStructuredItems(source.highlights || source.items, normalizeHighlightItem, [
                    { text: 'Route-owned runtime authority remains unchanged.' },
                    { text: 'Reusable blocks stay rollback-safe and schema-bounded.' },
                    { text: 'Trust messaging remains deterministic and reviewable.' },
                ]),
            };
        case 'TestimonialBlock':
            return {
                title: normalizeString(source.title, 'Success Stories'),
                quote: normalizeString(source.quote, 'This platform completely changed my earning capability while allowing me to manage my home.'),
                author: normalizeString(source.author, 'Priya Sharma'),
                role: normalizeString(source.role, 'Elite Agent'),
            };
        case 'CTABlock':
            return {
                label: normalizeString(source.label, 'Ready to start your journey?'),
                description: normalizeString(source.description),
                ctaMode: normalizeString(source.ctaMode, normalizeBoolean(source.useSmartCTA, false) ? 'smart' : 'link'),
                primaryCtaLabel: normalizeString(source.primaryCtaLabel || source.buttonText, 'Apply Now'),
                primaryCtaHref: normalizeHref(source.primaryCtaHref || source.href, '/apply'),
                secondaryCtaLabel: normalizeString(source.secondaryCtaLabel),
                secondaryCtaHref: normalizeHref(source.secondaryCtaHref, '/why'),
            };
        case 'FAQBlock':
            return {
                title: normalizeString(source.title, 'Frequently Asked Questions'),
                items: normalizeStructuredItems(source.items || source.faqs, normalizeFaqItem, [
                    { question: 'Is this really zero investment?', answer: 'Yes, the Bima Sakhi program strictly requires zero upfront monetary investment to join.' },
                ]),
            };
        case 'MediaBlock':
            return {
                eyebrow: normalizeString(source.eyebrow, 'Featured Media'),
                title: normalizeString(source.title, 'Structured media block'),
                description: normalizeString(source.description, 'Use this block for governed public visuals and supporting narrative.'),
                mediaSrc: normalizeHref(source.mediaSrc || source.imageSrc, ''),
                mediaAlt: normalizeString(source.mediaAlt || source.imageAlt, 'Featured media'),
                primaryCtaLabel: normalizeString(source.primaryCtaLabel || source.buttonText, 'Learn More'),
                primaryCtaHref: normalizeHref(source.primaryCtaHref || source.href, '/resources'),
            };
        case 'CalculatorBlock':
            return {
                title: normalizeString(source.title, 'Income Potential'),
                subtitle: normalizeString(source.subtitle, 'Calculate your expected returns dynamically.'),
            };
        case 'DownloadBlock':
            return {
                title: normalizeString(source.title, 'Exclusive Resources'),
                description: normalizeString(source.description, 'Gain access to top-tier agent methodologies securely.'),
                primaryCtaLabel: normalizeString(source.primaryCtaLabel || source.buttonText, 'Browse Downloads'),
                primaryCtaHref: normalizeHref(source.primaryCtaHref || source.href, '/resources'),
            };
        default:
            return source;
    }
}

export function normalizeBlockEditorInput(blockType, inputData = {}) {
    const definition = getBlockDefinition(blockType);
    const { legacyData } = readBlockPersistenceState(blockType, inputData);
    const source = legacyData;

    if (!definition) {
        return source;
    }

    const nextData = { ...source };

    for (const field of definition.fields || []) {
        if (field.type !== 'json' || !Object.prototype.hasOwnProperty.call(nextData, field.key)) continue;

        nextData[field.key] = parseEditorJsonValue(nextData[field.key], field, definition.displayName);
    }

    return normalizeBlockData(blockType, nextData);
}

function buildCanonicalBlockContract(blockType, definition, normalizedData = {}) {
    const canonical = {
        block_type: normalizeString(blockType),
        variant: normalizeString(definition?.defaultVariant, 'default'),
        props: {},
        cta: {},
        assets: {},
        metadata: buildCanonicalContractMetadata(definition),
        version: normalizeString(definition?.contractVersion, CANONICAL_CONTRACT_VERSION),
    };

    const mappedKeys = new Set();

    for (const field of definition?.fields || []) {
        if (!Object.prototype.hasOwnProperty.call(normalizedData, field.key)) continue;

        const contractSection = field.contractSection || 'props';
        if (!Object.prototype.hasOwnProperty.call(canonical, contractSection)) continue;

        canonical[contractSection][field.key] = normalizedData[field.key];
        mappedKeys.add(field.key);
    }

    for (const [key, value] of Object.entries(normalizedData)) {
        if (mappedKeys.has(key)) continue;
        canonical.props[key] = value;
    }

    return canonical;
}

export function projectCanonicalBlockContract(blockType, inputData = {}, options = {}) {
    const definition = getBlockDefinition(blockType);
    const normalizedData = options.normalized ? stripPersistenceMetadata(inputData) : normalizeBlockData(blockType, inputData);

    return buildCanonicalBlockContract(blockType, definition, normalizedData);
}

function buildShadowedBlockData(blockType, normalizedData = {}) {
    const legacyData = stripPersistenceMetadata(normalizedData);

    return {
        ...legacyData,
        [PERSISTENCE_SHADOW_KEY]: projectCanonicalBlockContract(blockType, legacyData, { normalized: true }),
        [PERSISTENCE_META_KEY]: {
            mode: 'legacy_plus_canonical_shadow',
            version: CANONICAL_CONTRACT_VERSION,
        },
    };
}

export function projectCanonicalBlockRecord(block) {
    if (!block || typeof block !== 'object') return null;

    return {
        ...block,
        canonical_contract: projectCanonicalBlockContract(block.block_type, block.block_data),
    };
}

export function projectCanonicalBlockRecords(blocks) {
    return Array.isArray(blocks) ? blocks.map((block) => projectCanonicalBlockRecord(block)).filter(Boolean) : [];
}

const BLOCK_DEFINITIONS = {
    HeroBlock: {
        blockType: 'HeroBlock',
        displayName: 'Hero',
        classification: 'PARTIALLY_REUSABLE',
        durability: 'PARTIALLY_DURABLE',
        surfaces: ['REUSABLE_RUNTIME', 'CTA_PRIMITIVE', 'MEDIA_PRIMITIVE', 'HYDRATION_NORMALIZED'],
        capabilities: FOUNDATION_CAPABILITIES,
        editorMode: 'fields',
        fields: [
            { key: 'eyebrow', label: 'Eyebrow', type: 'text', placeholder: 'Optional short label' },
            { key: 'headline', label: 'Headline', type: 'text', placeholder: 'Hero large text' },
            { key: 'subheadline', label: 'Subheadline', type: 'textarea', rows: 3, placeholder: 'Hero descriptive text' },
            { key: 'ctaMode', label: 'Primary CTA Mode', type: 'select', contractSection: 'cta', options: [{ label: 'Smart CTA', value: 'smart' }, { label: 'Direct Link', value: 'link' }] },
            { key: 'primaryCtaLabel', label: 'Primary CTA Label', type: 'text', contractSection: 'cta', placeholder: 'Apply Now' },
            { key: 'primaryCtaHref', label: 'Primary CTA Href', type: 'url', contractSection: 'cta', placeholder: '/apply' },
            { key: 'secondaryCtaLabel', label: 'Secondary CTA Label', type: 'text', contractSection: 'cta', placeholder: 'Learn More' },
            { key: 'secondaryCtaHref', label: 'Secondary CTA Href', type: 'url', contractSection: 'cta', placeholder: '/why' },
            { key: 'mediaSrc', label: 'Media Source', type: 'url', contractSection: 'assets', placeholder: '/images/example.jpg' },
            { key: 'mediaAlt', label: 'Media Alt', type: 'text', contractSection: 'assets', placeholder: 'Accessible visual description' },
        ],
    },
    ContentBlock: {
        blockType: 'ContentBlock',
        displayName: 'Structured Content',
        classification: 'FOUNDATION_SAFE',
        durability: 'FOUNDATION_DURABLE',
        surfaces: ['REUSABLE_RUNTIME', 'STRUCTURED_CONTENT_PRIMITIVE'],
        capabilities: FOUNDATION_CAPABILITIES,
        editorMode: 'fields',
        fields: [
            { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Optional heading' },
            { key: 'html', label: 'RTE Content Payload (HTML)', type: 'textarea', rows: 6, placeholder: '<p>Standard rich text structure</p>', monospace: true },
        ],
    },
    BenefitsBlock: {
        blockType: 'BenefitsBlock',
        displayName: 'Benefits Grid',
        classification: 'FOUNDATION_SAFE',
        durability: 'FOUNDATION_DURABLE',
        surfaces: ['REUSABLE_RUNTIME', 'STRUCTURED_CONTENT_PRIMITIVE'],
        capabilities: FOUNDATION_CAPABILITIES,
        editorMode: 'fields',
        fields: [
            { key: 'title', label: 'Title', type: 'text', placeholder: 'Why Join Bima Sakhi?' },
            { key: 'subtitle', label: 'Subtitle', type: 'textarea', rows: 2, placeholder: 'Empowering women across India with financial independence.' },
            { key: 'items', label: 'Items JSON', type: 'json', jsonShape: 'array', rows: 8, placeholder: '[{"title":"Zero Investment","description":"...","icon":"✨"}]' },
        ],
    },
    AuthorityBlock: {
        blockType: 'AuthorityBlock',
        displayName: 'Authority / Trust',
        classification: 'FOUNDATION_SAFE',
        durability: 'FOUNDATION_DURABLE',
        surfaces: ['REUSABLE_RUNTIME', 'STRUCTURED_CONTENT_PRIMITIVE'],
        capabilities: FOUNDATION_CAPABILITIES,
        editorMode: 'fields',
        fields: [
            { key: 'eyebrow', label: 'Eyebrow', type: 'text', placeholder: 'Trusted Guidance' },
            { key: 'title', label: 'Title', type: 'text', placeholder: 'Built on structured guidance, not guesswork.' },
            { key: 'body', label: 'Body', type: 'textarea', rows: 4, placeholder: 'Trust narrative or policy-safe authority copy' },
            { key: 'highlights', label: 'Highlights JSON', type: 'json', jsonShape: 'array', rows: 7, placeholder: '[{"text":"Reviewable trust statement"}]' },
        ],
    },
    TestimonialBlock: {
        blockType: 'TestimonialBlock',
        displayName: 'Testimonial',
        classification: 'FOUNDATION_SAFE',
        durability: 'FOUNDATION_DURABLE',
        surfaces: ['REUSABLE_RUNTIME', 'STRUCTURED_CONTENT_PRIMITIVE'],
        capabilities: FOUNDATION_CAPABILITIES,
        editorMode: 'fields',
        fields: [
            { key: 'title', label: 'Section Title', type: 'text', placeholder: 'Success Stories' },
            { key: 'quote', label: 'Quote Text', type: 'textarea', rows: 3, placeholder: 'Testimonial text' },
            { key: 'author', label: 'Author', type: 'text', placeholder: 'e.g., Priya Sharma' },
            { key: 'role', label: 'Role', type: 'text', placeholder: 'Elite Agent' },
        ],
    },
    CTABlock: {
        blockType: 'CTABlock',
        displayName: 'CTA Group',
        classification: 'PARTIALLY_REUSABLE',
        durability: 'PARTIALLY_DURABLE',
        surfaces: ['REUSABLE_RUNTIME', 'CTA_PRIMITIVE', 'HYDRATION_NORMALIZED'],
        capabilities: FOUNDATION_CAPABILITIES,
        editorMode: 'fields',
        fields: [
            { key: 'label', label: 'Section Label', type: 'text', placeholder: 'Ready to start your journey?' },
            { key: 'description', label: 'Description', type: 'textarea', rows: 2, placeholder: 'Optional supporting copy' },
            { key: 'ctaMode', label: 'Primary CTA Mode', type: 'select', contractSection: 'cta', options: [{ label: 'Direct Link', value: 'link' }, { label: 'Smart CTA', value: 'smart' }] },
            { key: 'primaryCtaLabel', label: 'Primary CTA Label', type: 'text', contractSection: 'cta', placeholder: 'Apply Now' },
            { key: 'primaryCtaHref', label: 'Primary CTA Href', type: 'url', contractSection: 'cta', placeholder: '/apply' },
            { key: 'secondaryCtaLabel', label: 'Secondary CTA Label', type: 'text', contractSection: 'cta', placeholder: 'Learn More' },
            { key: 'secondaryCtaHref', label: 'Secondary CTA Href', type: 'url', contractSection: 'cta', placeholder: '/why' },
        ],
    },
    FAQBlock: {
        blockType: 'FAQBlock',
        displayName: 'FAQ',
        classification: 'FOUNDATION_SAFE',
        durability: 'FOUNDATION_DURABLE',
        surfaces: ['REUSABLE_RUNTIME', 'STRUCTURED_CONTENT_PRIMITIVE', 'HYDRATION_NORMALIZED'],
        capabilities: FOUNDATION_CAPABILITIES,
        editorMode: 'fields',
        fields: [
            { key: 'title', label: 'Title', type: 'text', placeholder: 'Frequently Asked Questions' },
            { key: 'items', label: 'FAQ JSON', type: 'json', jsonShape: 'array', rows: 8, placeholder: '[{"question":"...","answer":"..."}]' },
        ],
    },
    MediaBlock: {
        blockType: 'MediaBlock',
        displayName: 'Media Feature',
        classification: 'PARTIALLY_REUSABLE',
        durability: 'PARTIALLY_DURABLE',
        surfaces: ['REUSABLE_RUNTIME', 'MEDIA_PRIMITIVE'],
        capabilities: FOUNDATION_CAPABILITIES,
        editorMode: 'fields',
        fields: [
            { key: 'eyebrow', label: 'Eyebrow', type: 'text', placeholder: 'Featured Media' },
            { key: 'title', label: 'Title', type: 'text', placeholder: 'Structured media block' },
            { key: 'description', label: 'Description', type: 'textarea', rows: 3, placeholder: 'Media-supporting narrative' },
            { key: 'mediaSrc', label: 'Media Source', type: 'url', contractSection: 'assets', placeholder: '/images/example.jpg' },
            { key: 'mediaAlt', label: 'Media Alt', type: 'text', contractSection: 'assets', placeholder: 'Featured media' },
            { key: 'primaryCtaLabel', label: 'Primary CTA Label', type: 'text', contractSection: 'cta', placeholder: 'Learn More' },
            { key: 'primaryCtaHref', label: 'Primary CTA Href', type: 'url', contractSection: 'cta', placeholder: '/resources' },
        ],
    },
    CalculatorBlock: {
        blockType: 'CalculatorBlock',
        displayName: 'Calculator',
        classification: 'READ_ONLY_BY_DESIGN',
        durability: 'FOUNDATION_DURABLE',
        surfaces: ['REUSABLE_RUNTIME', 'READ_ONLY_BY_DESIGN'],
        capabilities: FOUNDATION_CAPABILITIES,
        editorMode: 'read-only',
        fields: [],
    },
    DownloadBlock: {
        blockType: 'DownloadBlock',
        displayName: 'Downloads CTA',
        classification: 'FOUNDATION_SAFE',
        durability: 'FOUNDATION_DURABLE',
        surfaces: ['REUSABLE_RUNTIME', 'CTA_PRIMITIVE', 'MEDIA_PRIMITIVE'],
        capabilities: FOUNDATION_CAPABILITIES,
        editorMode: 'fields',
        fields: [
            { key: 'title', label: 'Title', type: 'text', placeholder: 'Exclusive Resources' },
            { key: 'description', label: 'Description', type: 'textarea', rows: 3, placeholder: 'Gain access to top-tier agent methodologies securely.' },
            { key: 'primaryCtaLabel', label: 'Primary CTA Label', type: 'text', contractSection: 'cta', placeholder: 'Browse Downloads' },
            { key: 'primaryCtaHref', label: 'Primary CTA Href', type: 'url', contractSection: 'cta', placeholder: '/resources' },
        ],
    },
};

export function listBlockDefinitions() {
    return Object.values(BLOCK_DEFINITIONS);
}

export function getBlockDefinition(blockType) {
    return BLOCK_DEFINITIONS[blockType] || null;
}

export function normalizeBlockRecord(block) {
    if (!block || typeof block !== 'object') return null;

    const definition = getBlockDefinition(block.block_type);
    const readState = readBlockPersistenceState(block.block_type, block.block_data);
    const normalizedData = definition ? normalizeBlockData(block.block_type, block.block_data) : readState.legacyData;
    const canonicalContract = projectCanonicalBlockContract(block.block_type, normalizedData, { normalized: true });
    const persistence = buildBlockPersistenceMetadata(definition, readState);

    if (!definition) {
        return {
            ...block,
            block_data: normalizedData,
            canonical_contract: canonicalContract,
            persistence,
            foundation: {
                classification: 'FOUNDATION_FRAGILE',
                durability: 'FOUNDATION_FRAGILE',
                surfaces: ['PARTIALLY_OPERATIONAL'],
                capabilities: { ...FOUNDATION_CAPABILITIES, reusableSafe: false },
            },
        };
    }

    return {
        ...block,
        block_data: normalizedData,
        canonical_contract: canonicalContract,
        persistence,
        foundation: {
            classification: definition.classification,
            durability: definition.durability,
            surfaces: definition.surfaces,
            capabilities: definition.capabilities,
        },
    };
}

export function normalizeBlockRecords(blocks) {
    return Array.isArray(blocks) ? blocks.map((block) => normalizeBlockRecord(block)).filter(Boolean) : [];
}

export function normalizeBlockPayloadForSave(block) {
    if (!block || typeof block !== 'object') return null;

    const definition = getBlockDefinition(block.block_type);
    const readState = readBlockPersistenceState(block.block_type, block.block_data);
    const normalizedData = definition ? normalizeBlockEditorInput(block.block_type, block.block_data) : readState.legacyData;

    return {
        id: block.id || null,
        block_type: normalizeString(block.block_type),
        block_order: Number.isFinite(block.block_order) ? block.block_order : 0,
        block_data: buildShadowedBlockData(block.block_type, normalizedData),
    };
}

export function normalizeBlockPayloadsForSave(blocks) {
    return Array.isArray(blocks) ? blocks.map((block) => normalizeBlockPayloadForSave(block)).filter(Boolean) : [];
}