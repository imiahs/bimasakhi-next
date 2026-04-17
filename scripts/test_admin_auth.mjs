import { SignJWT } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const token = await new SignJWT({ role: 'admin' })
    .setSubject('test-admin')
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret);

// Try login first
const loginResp = await fetch('https://bimasakhi.com/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: process.env.ADMIN_PASSWORD })
});
console.log('Login status:', loginResp.status);
const setCookie = loginResp.headers.getSetCookie();
console.log('Set-Cookie:', setCookie);
const loginBody = await loginResp.text();
console.log('Login body:', loginBody.substring(0, 300));

// If login works, use that cookie
if (setCookie.length > 0) {
    const cookie = setCookie[0].split(';')[0];
    console.log('\nUsing cookie from login:', cookie.substring(0, 30) + '...');
    const dashResp = await fetch('https://bimasakhi.com/api/admin/ops-dashboard', {
        headers: { 'Cookie': cookie }
    });
    console.log('Dashboard status:', dashResp.status);
    const dashBody = await dashResp.text();
    console.log('Dashboard:', dashBody.substring(0, 300));
}
