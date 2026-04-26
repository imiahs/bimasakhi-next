import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
const adminEmail = (process.env.ADMIN_EMAIL || 'admin@bimasakhi.com').trim().toLowerCase();

// Login to get admin cookie
const loginResp = await fetch('https://bimasakhi.com/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: process.env.ADMIN_PASSWORD }),
});
const cookie = loginResp.headers.getSetCookie()[0].split(';')[0];

// Test /api/admin/logs
const resp = await fetch('https://bimasakhi.com/api/admin/logs', {
    headers: { 'Cookie': cookie, 'Accept': 'application/json' }
});
console.log('Status:', resp.status);
const data = await resp.json();
if (resp.status === 200) {
    console.log('✓ 200 OK');
    console.log('Log count:', data.logs?.length);
    const types = [...new Set(data.logs?.map(l => l.type) || [])];
    console.log('Types:', types);
    if (data.logs?.length > 0) {
        console.log('Sample:', JSON.stringify(data.logs[0]).substring(0, 200));
    }
} else {
    console.log('✗ ERROR:', JSON.stringify(data).substring(0, 400));
}
