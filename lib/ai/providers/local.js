// Simulated Local AI Provider for Database/Offline Usage Environments
export async function generateWithLocal(prompt, context) {
    const action = context.action || 'general';

    // Simulated parsing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Basic heuristic generation for simulation mode
    if (action === 'generate-blog-outline') {
        return `1. Introduction to ${context.keyword || 'topic'}\n2. Key Benefits and Details\n3. Common Questions\n4. Conclusion`;
    }

    if (action === 'generate-seo-title') {
        const base = context.keyword || 'Content';
        return `Expert Guide: Best ${base} for Maximum Returns (Updated)`;
    }

    if (action === 'generate-seo-desc') {
        return `Learn everything you need to know about ${context.keyword || 'this topic'} to maximize your returns. Discover our exclusive tips and strategies today.`;
    }

    if (action === 'lead-analysis') {
        return `Analysis Complete: Most leads originate from Mobile via Web Search. Top performing asset is 'Income Calculator'. Suggested action: Focus more localized ad spend on Delhi.`;
    }

    if (action === 'page-seo-analysis') {
        return {
            score: 75,
            suggestions: ['Increase keyword density in H2 tags', 'Add 2 internal links to /income tool', 'Extend word count by 300 words'],
            generated_keywords: ['Insurance Plan', 'Guaranteed Returns', 'Best Policy'],
            internal_links: ['/tools', '/about']
        };
    }

    // Default simulation fallback
    return `[SIMULATED RESPONSE] Received prompt: "${prompt}". Proceeding with default simulated logic framework.`;
}
