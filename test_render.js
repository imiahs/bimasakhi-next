const axios = require('axios');
async function testRender() {
    try {
        console.log("Fetching /blog...");
        const res = await axios.get('https://bimasakhi.com/blog');
        console.log("Status:", res.status);
        if (res.status === 200) {
            console.log("✅ Page loads successfully (Status 200).");
            // Check metadata
            const html = res.data;
            if (html.includes('<title>') || html.includes('next-head')) {
                console.log("✅ Metadata present.");
            } else {
                console.log("❌ Metadata missing.");
            }
            if (html.includes('Bima Sakhi') || html.includes('blog')) {
                console.log("✅ Page Content verification passed.");
            }
        } else {
            console.log("❌ Page Render Test Failed. Status:", res.status);
            process.exit(1);
        }
    } catch(e) {
         console.error("❌ Page Render Test Failed. Exception:", e.message);
         process.exit(1);
    }
}
testRender();
