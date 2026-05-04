. "$PSScriptRoot\_AuditUtils.ps1"
Import-AuditEnv
$result = New-AuditResult "admin-systems-read-ps"

try {
    Add-AuditCheck $result "env_presence_masked" "INFO" (Get-EnvPresence @("ADMIN_PASSWORD"))
    $baseUrl = Get-BaseUrl
    $adminPassword = [Environment]::GetEnvironmentVariable("ADMIN_PASSWORD", "Process")
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

    if (-not $adminPassword) {
        Add-AuditCheck $result "admin_login" "FAIL" @{ reason = "ADMIN_PASSWORD missing" }
    } else {
        $login = Invoke-JsonRequest -Method POST -Uri "$baseUrl/api/admin/login" -Headers @{ "Content-Type" = "application/json"; Origin = $baseUrl } -Body (Get-AdminLoginBody $adminPassword) -WebSession $session -TimeoutSec 35
        Add-AuditCheck $result "admin_login" ($(if ($login.ok -and $session.Cookies.Count -gt 0) { "PASS" } else { "FAIL" })) @{
            status = $login.status
            ok = $login.ok
            cookie_count = $session.Cookies.Count
            body = $login.body
            error = $login.error
        }
    }

    if ($session.Cookies.Count -gt 0) {
        $endpoints = @(
            @{ name = "drafts"; url = "$baseUrl/api/admin/ccc/drafts?limit=5" },
            @{ name = "bulk"; url = "$baseUrl/api/admin/ccc/bulk" },
            @{ name = "media"; url = "$baseUrl/api/admin/media" },
            @{ name = "logs"; url = "$baseUrl/api/admin/logs" },
            @{ name = "audit_log"; url = "$baseUrl/api/admin/audit-log?limit=5" },
            @{ name = "feature_flags"; url = "$baseUrl/api/admin/feature-flags" },
            @{ name = "workflow_config"; url = "$baseUrl/api/admin/workflow-config" },
            @{ name = "users"; url = "$baseUrl/api/admin/users" },
            @{ name = "geo_cities"; url = "$baseUrl/api/admin/locations/cities" },
            @{ name = "system_health"; url = "$baseUrl/api/admin/system/health" }
        )

        foreach ($endpoint in $endpoints) {
            $res = Invoke-JsonRequest -Method GET -Uri $endpoint.url -WebSession $session -TimeoutSec 40
            $bodyJson = if ($res.body -is [string]) { $res.body.Substring(0, [Math]::Min(500, $res.body.Length)) } else { $res.body | ConvertTo-Json -Depth 5 }
            Add-AuditCheck $result "admin_endpoint_$($endpoint.name)" ($(if ($res.ok) { "PASS" } else { "FAIL" })) @{
                status = $res.status
                ok = $res.ok
                url = $endpoint.url
                body_sample = $bodyJson.Substring(0, [Math]::Min(700, $bodyJson.Length))
                error = $res.error
            }
        }
    }
} catch {
    Add-AuditError $result "admin_systems_read_unhandled" $_
}

Write-AuditResult (Complete-AuditResult $result)

