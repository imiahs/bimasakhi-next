export default function robots() {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/api/', '/thank-you/'],
        },
        sitemap: 'https://bimasakhi.com/sitemap.xml',
    };
}
