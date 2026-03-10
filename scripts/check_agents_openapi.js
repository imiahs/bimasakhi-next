const fs = require('fs');
const envLocal = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => envLocal.match(new RegExp(`^${key}=['"]?(.*?)['"]?$`, 'm'))?.[1]?.trim();

const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const key = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

async function check() {
    const res = await fetch(`${url}/rest/v1/?apikey=${key}`);
    const data = await res.json();
    console.log(data.definitions.agents.properties);
}
check();
