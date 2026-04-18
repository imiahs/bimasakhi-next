// lib/ai/imagePrompts.js
// Phase 3: Image Intelligence System
// Generates platform-optimized image prompts per content type
// Structure: { hero: {canva, adobe, imagen}, thumbnail: {canva, adobe, imagen}, og: {canva, adobe, imagen} }

/**
 * Generate structured image prompts for a page based on content type and context.
 * Returns prompts for 3 image types × 3 platforms = 9 total prompts.
 *
 * @param {Object} pageContext - { city, locality, slug, content_type }
 * @param {Object} aiContent - { hero_headline, meta_title, meta_description }
 * @returns {Object} { hero: {canva, adobe, imagen}, thumbnail: {canva, adobe, imagen}, og: {canva, adobe, imagen} }
 */
export function generateImagePrompts(pageContext, aiContent) {
    const { city = '', locality = '', content_type = 'local_service' } = pageContext;
    const heroHeadline = aiContent?.hero_headline || '';
    const location = locality ? `${locality}, ${city}` : city;

    const templates = getTemplatesByContentType(content_type, location, city, heroHeadline);

    return {
        hero: {
            canva: addPlatformPrefix('canva', templates.hero),
            adobe: addPlatformPrefix('adobe', templates.hero),
            imagen: addPlatformPrefix('imagen', templates.hero),
        },
        thumbnail: {
            canva: addPlatformPrefix('canva', templates.thumbnail),
            adobe: addPlatformPrefix('adobe', templates.thumbnail),
            imagen: addPlatformPrefix('imagen', templates.thumbnail),
        },
        og: {
            canva: addPlatformPrefix('canva', templates.og),
            adobe: addPlatformPrefix('adobe', templates.og),
            imagen: addPlatformPrefix('imagen', templates.og),
        }
    };
}

/**
 * Get base image prompt templates based on content type.
 */
function getTemplatesByContentType(contentType, location, city, heroHeadline) {
    switch (contentType) {
        case 'career':
            return {
                hero: `Confident Indian woman entrepreneur (28–38 years old) standing in a modern coworking space or light, airy home office in ${city}. She is smiling at camera with a laptop open, notebooks and insurance files on desk. Expression conveys independence, success, and approachability. Natural bright lighting. Background: blurred warm interior. Real photography style. Horizontal 16:9 format, 1200x500px.`,
                thumbnail: `Clean professional icon: Career growth chart combined with a confident woman silhouette. Emerald green (#10b981) and gold (#f59e0b) color palette. Minimal flat design. No text. Square format, 400x400px.`,
                og: `Social media card with bold text: 'Become a LIC Agent in ${city}'. Subtitle: 'Financial Independence. Flexible Hours. Real Income.' Illustrated icons: rupee coin, calendar, shield. Color: white background, emerald + navy accent. Professional clean layout. 1200x630px.`
            };

        case 'policy_info':
            return {
                hero: `Simple, clean infographic-style illustration showing the life stages of an Indian family: young couple → young parents with child → established family → happy retirement. Indian context (traditional attire mix with modern). Warm, optimistic color palette: saffron, green, sky blue. LIC-adjacent but brand-neutral. No logos. Horizontal banner format, 1200x500px.`,
                thumbnail: `Clean professional icon: Insurance policy document with a protective shield and family silhouette. Deep navy (#0B0F14) and emerald (#10b981) color palette. Minimal flat design. No text. Square format, 400x400px.`,
                og: `Professional typographic social share card. Bold headline: '${heroHeadline}' in clean sans-serif font. Background: deep navy (#0B0F14) to emerald (#10b981) gradient. Gold accent line. Bottom: 'bimasakhi.com' in small white text. Right side: small icon of policy document. No photos. 1200x630px.`
            };

        case 'local_service':
        default:
            return {
                hero: `Warm, professional photograph of an Indian woman (30–40 years old) in business-casual attire — saree or salwar kameez in muted professional tones — sitting across from a middle-class Indian family (husband, wife, 2 children) in a modest but clean home interior in ${location}. She is explaining insurance documents with a gentle, trustworthy expression. Soft golden hour lighting through window. Real photography style, not illustration. No text overlays. Horizontal 16:9 format, 1200x500px.`,
                thumbnail: `Clean professional icon: LIC policy document shield combined with a subtle ${city} skyline or landmark silhouette. Emerald green (#10b981) and gold (#f59e0b) color palette. Minimal flat design. No text. Square format, 400x400px.`,
                og: `Professional typographic social share card. Bold headline: '${heroHeadline}' in clean sans-serif font. Bilingual (Hindi phrase below English). Background: deep navy (#0B0F14) to emerald (#10b981) gradient. Gold accent line. Bottom: 'bimasakhi.com' in small white text. Right side: small icon of woman in professional attire. No photos. 1200x630px.`
            };
    }
}

/**
 * Add platform-specific optimization prefixes to prompts.
 */
function addPlatformPrefix(platform, basePrompt) {
    switch (platform) {
        case 'canva':
            return `[Canva Magic Media] Art style: photorealistic. ${basePrompt} Style: warm, professional, Indian context.`;
        case 'adobe':
            return `[Adobe Firefly] Content type: photo. ${basePrompt} Style reference: professional corporate photography, Indian setting. Avoid: copyrighted logos, brand names.`;
        case 'imagen':
            return `[Google Imagen] Photorealistic, high quality. ${basePrompt} Safety: family-friendly, professional context. No text in image.`;
        default:
            return basePrompt;
    }
}
