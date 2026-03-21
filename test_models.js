const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=(.*)$/);
        if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
    });
} catch(e) {}

async function testModels() {
    console.log("Testing Google Generative AI access...");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("Missing GEMINI_API_KEY!");
        process.exit(1);
    }
    console.log("API Key loaded:", apiKey.substring(0, 5) + "...");
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTest = [
        "gemini-1.5-pro",
        "gemini-1.5-flash",
        "gemini-pro",
        "gemini-1.0-pro"
    ];

    const results = {};
    for (const modelName of modelsToTest) {
        try {
            console.log(`\nTesting model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say 'hello' and nothing else.");
            console.log(`✅ Success with ${modelName}`);
            results[modelName] = "OK: " + result.response.text();
        } catch(e) {
            console.error(`❌ Failed with ${modelName}`);
            results[modelName] = "FAIL: " + e.message;
        }
    }
    fs.writeFileSync('models_out.json', JSON.stringify(results, null, 2));
}
testModels();
