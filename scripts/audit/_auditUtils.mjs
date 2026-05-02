import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const AUDIT_DIR = __dirname;
export const RESULTS_DIR = path.join(AUDIT_DIR, 'results');
export const TEST_PREFIX = 'TEST_AUDIT_';

export function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env.local not found at ${envPath}`);
  }

  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, valueRaw] = match;
    let value = valueRaw.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

export function mask(value) {
  if (!value) return null;
  const text = String(value);
  if (text.length <= 8) return `${'*'.repeat(text.length)} (${text.length} chars)`;
  return `${text.slice(0, 4)}...${text.slice(-4)} (${text.length} chars)`;
}

export function envPresence(keys) {
  return Object.fromEntries(keys.map((key) => [key, {
    present: Boolean(process.env[key]),
    masked: mask(process.env[key]),
  }]));
}

export function makeResult(name) {
  return {
    name,
    started_at: new Date().toISOString(),
    finished_at: null,
    status: 'UNKNOWN',
    checks: [],
    errors: [],
  };
}

export function addCheck(result, name, status, evidence = {}) {
  result.checks.push({
    name,
    status,
    evidence,
    timestamp: new Date().toISOString(),
  });
}

export function addError(result, name, error) {
  result.errors.push({
    name,
    message: error?.message || String(error),
    code: error?.code || null,
    timestamp: new Date().toISOString(),
  });
}

export function finalize(result) {
  result.finished_at = new Date().toISOString();
  if (result.errors.length > 0) {
    result.status = result.checks.some((check) => check.status === 'PASS') ? 'PARTIAL' : 'FAIL';
  } else if (result.checks.every((check) => check.status === 'PASS' || check.status === 'INFO')) {
    result.status = 'PASS';
  } else {
    result.status = 'PARTIAL';
  }
  return result;
}

export function writeResult(result) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}-${result.name}.json`;
  const filePath = path.join(RESULTS_DIR, filename);
  fs.writeFileSync(filePath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  console.log(`RESULT_FILE=${filePath}`);
}

export function getServiceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase URL or service role key is missing.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let body = text;
    try {
      body = JSON.parse(text);
    } catch {
      body = text.slice(0, 500);
    }
    return { ok: response.ok, status: response.status, headers: Object.fromEntries(response.headers), body };
  } finally {
    clearTimeout(timer);
  }
}

export function canonicalBaseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://bimasakhi.com').replace(/\/$/, '');
}

export function adminEmail() {
  return (process.env.ADMIN_EMAIL || 'admin@bimasakhi.com').trim().toLowerCase();
}

export function adminLoginPayload(password = process.env.ADMIN_PASSWORD) {
  return {
    email: adminEmail(),
    password,
  };
}

