. "$PSScriptRoot\_AuditUtils.ps1"
Import-AuditEnv
$result = New-AuditResult "vercel-runtime-ps"

try {
    Add-AuditCheck $result "env_presence_masked" "INFO" (Get-EnvPresence @("NEXT_PUBLIC_SITE_URL","ADMIN_PASSWORD","JWT_SECRET","SUPABASE_URL","QSTASH_TOKEN"))
    $baseUrl = Get-BaseUrl
    Add-AuditCheck $result "base_url" "INFO" @{ baseUrl = $baseUrl }

    $routes = @(
        @{ name = "status"; url = "$baseUrl/api/status" },
        @{ name = "test_get"; url = "$baseUrl/api/test" },
        @{ name = "navigation"; url = "$baseUrl/api/navigation" },
        @{ name = "sitemap_xml"; url = "$baseUrl/sitemap.xml" },
        @{ name = "home"; url = "$baseUrl/" },
        @{ name = "why"; url = "$baseUrl/why" }
    )

    foreach ($route in $routes) {
        $response = Invoke-JsonRequest -Method GET -Uri $route.url -TimeoutSec 35
        $sample = if ($response.body -is [string]) { $response.body.Substring(0, [Math]::Min(260, $response.body.Length)) } else { $response.body }
        Add-AuditCheck $result "route_$($route.name)" ($(if ($response.ok) { "PASS" } else { "FAIL" })) @{
            url = $route.url
            status = $response.status
            ok = $response.ok
            body_sample = $sample
            error = $response.error
        }
    }

    $adminPassword = [Environment]::GetEnvironmentVariable("ADMIN_PASSWORD", "Process")
    if ($adminPassword) {
        $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
        $loginBody = Get-AdminLoginBody $adminPassword
        $login = Invoke-JsonRequest -Method POST -Uri "$baseUrl/api/admin/login" -Headers @{ "Content-Type" = "application/json"; Origin = $baseUrl } -Body $loginBody -WebSession $session -TimeoutSec 35
        Add-AuditCheck $result "admin_login_runtime" ($(if ($login.ok -and $session.Cookies.Count -gt 0) { "PASS" } else { "FAIL" })) @{
            status = $login.status
            ok = $login.ok
            cookie_count = $session.Cookies.Count
            body = $login.body
            error = $login.error
        }
    } else {
        Add-AuditCheck $result "admin_login_runtime" "INFO" @{ skipped = $true; reason = "ADMIN_PASSWORD missing locally" }
    }
} catch {
    Add-AuditError $result "vercel_runtime_unhandled" $_
}

Write-AuditResult (Complete-AuditResult $result)

