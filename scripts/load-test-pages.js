const fs = require('fs');

async function runLoadTest(targetDomain = 'http://localhost:3000', requests = 1000) {
    console.log(`\n==========================================`);
    console.log(`[TEST] Invoking SEO Edge Load Simulation...`);
    console.log(`[TEST] Target: ${targetDomain} | Requests: ${requests}`);
    console.log(`==========================================\n`);

    const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' };
    const simulatedPaths = ['/bima-sakhi-delhi', '/bima-sakhi-gurgaon', '/bima-sakhi-noida', '/bima-sakhi-pune'];

    let hits = 0;
    let errors = 0;
    let times = [];

    const maxConcurrency = 50;
    let active = 0;

    const executeRequest = async (i) => {
        const start = Date.now();
        const path = simulatedPaths[i % simulatedPaths.length];
        try {
            const res = await fetch(`${targetDomain}${path}`, { headers });
            const cacheHit = res.headers.get('x-edge-cache') === 'HIT';
            if (cacheHit) hits++;
            times.push(Date.now() - start);
        } catch (e) {
            errors++;
        }
    };

    console.time('Total Runtime');

    // Simple batched concurrency
    for (let i = 0; i < requests; i += maxConcurrency) {
        const promises = [];
        for (let j = 0; j < maxConcurrency && (i + j) < requests; j++) {
            promises.push(executeRequest(i + j));
        }
        await Promise.all(promises);
        process.stdout.write(`\r[PROGRESS] ${Math.min(i + maxConcurrency, requests)} / ${requests}`);
    }

    console.log('\n');
    console.timeEnd('Total Runtime');

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

    console.log(`\n====== LOAD RESULTS ======`);
    console.log(`Total Requests: ${requests}`);
    console.log(`Edge Cache HIT Ratio: ${(hits / requests * 100).toFixed(1)}%`);
    console.log(`Failed Errors: ${errors}`);
    console.log(`Average Response Time: ${Math.round(avgTime)}ms`);
    console.log(`==========================\n`);
}

// Support CLI overrides or fallback locally 
runLoadTest(process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000', parseInt(process.argv[3]) || 1000);
