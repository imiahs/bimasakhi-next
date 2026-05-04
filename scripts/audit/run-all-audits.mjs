import { spawnSync } from 'node:child_process';

const scripts = [
  'audit-vercel-runtime.mjs',
  'audit-supabase-data-integrity.mjs',
  'audit-qstash.mjs',
  'audit-zoho.mjs',
  'audit-admin-content-flow.mjs',
];

let failed = false;

for (const script of scripts) {
  console.log(`\n===== RUNNING ${script} =====`);
  const res = spawnSync(process.execPath, [`scripts/audit/${script}`], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });
  if (res.status !== 0) failed = true;
}

process.exit(failed ? 1 : 0);

