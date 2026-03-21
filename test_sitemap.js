const axios = require('axios');

async function testSitemap() {
    console.log("Fetching /sitemap.xml...");
    try {
        const res = await axios.get('https://bimasakhi.com/sitemap.xml');
        console.log("Status:", res.status);
        if (res.status === 200 && res.data.includes('<?xml')) {
            const numUrls = (res.data.match(/<url>/g) || []).length;
            console.log(`✅ Sitemap loaded with ${numUrls} URLs.`);
            if (numUrls <= 100) {
                console.log("✅ Limit = 100 respected.");
            } else {
                console.log(`❌ Limit exceeded: ${numUrls} > 100.`);
            }
        } else {
            console.log("❌ Failed to load sitemap XML.");
            process.exit(1);
        }
    } catch(e) {
        console.error("❌ Sitemap fetch failed:", e.message);
        process.exit(1);
    }
}
testSitemap();
