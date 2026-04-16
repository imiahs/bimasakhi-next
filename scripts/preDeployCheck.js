const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return;

    const key = match[1];
    const value = match[2].replace(/^["']|["']$/g, '').trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

loadEnvFile(path.resolve(process.cwd(), '.env.local'));
loadEnvFile(path.resolve(process.cwd(), '.env.preview.local'));

const runtimeMode = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
const strictProductionChecks = runtimeMode === 'production';

const requiredEnvVars = strictProductionChecks
  ? [
      'GEMINI_API_KEY',
      'QSTASH_TOKEN',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'REDIS_URL',
      'ZOHO_CLIENT_ID',
      'ZOHO_CLIENT_SECRET',
      'ZOHO_REFRESH_TOKEN',
      'JWT_SECRET',
      'CRON_SECRET',
      'SUPABASE_WEBHOOK_SECRET'
    ]
  : [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'REDIS_URL',
      'ZOHO_CLIENT_ID',
      'ZOHO_CLIENT_SECRET',
      'ZOHO_REFRESH_TOKEN'
    ];

console.log('== PRE-DEPLOYMENT VERIFICATION ==');
console.log(`Environment mode: ${runtimeMode}`);

let hasError = false;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`MISSING ENV: ${envVar}`);
    hasError = true;
  } else {
    console.log(`FOUND: ${envVar}`);
  }
}

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const driftScript = path.resolve(process.cwd(), 'scripts', 'checkMigrationDrift.js');
  if (!fs.existsSync(driftScript)) {
    console.error('MISSING SCRIPT: scripts/checkMigrationDrift.js');
    hasError = true;
  } else {
    console.log('FOUND: scripts/checkMigrationDrift.js');
    const driftCheck = spawnSync(process.execPath, [driftScript], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit'
    });

    if (driftCheck.status !== 0) {
      console.error('MIGRATION DRIFT CHECK FAILED.');
      hasError = true;
    } else {
      console.log('PASSED: migration drift gate');
    }
  }
}

if (hasError) {
  console.error('Pre-deployment checks failed.');
  process.exit(1);
}

console.log('All required environment variables are present.');
console.log('SAFE TO DEPLOY.');
