const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=(.*)$/);
        if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
    });
} catch(e) {}

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("API Key:", apiKey ? apiKey.substring(0, 8) + "..." : "MISSING");
    
    // Use REST API directly to list models
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    console.log("Fetching model list...");
    
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.models) {
            const generateModels = data.models
                .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
                .map(m => ({ name: m.name, displayName: m.displayName }));
            console.log("Models supporting generateContent:");
            generateModels.forEach(m => console.log(`  ${m.name} (${m.displayName})`));
            fs.writeFileSync('available_models.json', JSON.stringify(generateModels, null, 2));
        } else {
            console.log("Error:", JSON.stringify(data));
        }
    } catch(e) {
        console.error("Fetch error:", e.message);
    }
}
listModels();
