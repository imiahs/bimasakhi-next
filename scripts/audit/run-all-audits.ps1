$ErrorActionPreference = "Continue"
$scripts = @(
    "audit-vercel-runtime.ps1",
    "audit-supabase-data-integrity.ps1",
    "audit-qstash.ps1",
    "audit-zoho.ps1",
    "audit-production-admin-db.ps1",
    "audit-admin-systems-read.ps1",
    "audit-admin-content-flow.ps1"
)

foreach ($script in $scripts) {
    Write-Output "`n===== RUNNING $script ====="
    & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot $script)
}
