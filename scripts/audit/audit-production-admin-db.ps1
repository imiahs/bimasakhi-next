. "$PSScriptRoot\_AuditUtils.ps1"
Import-AuditEnv
$result = New-AuditResult "production-admin-db-ps"

try {
    Add-AuditCheck $result "env_presence_masked" "INFO" (Get-EnvPresence @("ADMIN_PASSWORD"))
    $baseUrl = Get-BaseUrl
    $adminPassword = [Environment]::GetEnvironmentVariable("ADMIN_PASSWORD", "Process")
    if (-not $adminPassword) {
        Add-AuditCheck $result "admin_login" "FAIL" @{ reason = "ADMIN_PASSWORD missing" }
    } else {
        $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
        $login = Invoke-JsonRequest -Method POST -Uri "$baseUrl/api/admin/login" -Headers @{ "Content-Type" = "application/json"; Origin = $baseUrl } -Body (Get-AdminLoginBody $adminPassword) -WebSession $session -TimeoutSec 35
        Add-AuditCheck $result "admin_login" ($(if ($login.ok -and $session.Cookies.Count -gt 0) { "PASS" } else { "FAIL" })) @{
            status = $login.status
            ok = $login.ok
            cookie_count = $session.Cookies.Count
            body = $login.body
            error = $login.error
        }

        if ($login.ok -and $session.Cookies.Count -gt 0) {
            $flags = Invoke-JsonRequest -Method GET -Uri "$baseUrl/api/admin/feature-flags" -WebSession $session -TimeoutSec 35
            Add-AuditCheck $result "admin_db_query_feature_flags" ($(if ($flags.ok -and $flags.body.success) { "PASS" } else { "FAIL" })) @{
                status = $flags.status
                ok = $flags.ok
                success = $flags.body.success
                count = if ($flags.body.data) { $flags.body.data.Count } else { $null }
                error = $flags.error
            }

            $key = "test_audit_flag_$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
            $create = Invoke-JsonRequest -Method PUT -Uri "$baseUrl/api/admin/feature-flags" -Headers @{ "Content-Type" = "application/json"; Origin = $baseUrl } -Body (@{
                key = $key
                label = "$($Script:TestPrefix) Feature Flag"
                description = "$($Script:TestPrefix) production admin DB insert verification"
                category = "system"
                value = $false
                restricted = $true
            } | ConvertTo-Json) -WebSession $session -TimeoutSec 35
            Add-AuditCheck $result "admin_db_insert_test_feature_flag" ($(if ($create.ok -and $create.body.success) { "PASS" } else { "FAIL" })) @{
                status = $create.status
                ok = $create.ok
                success = $create.body.success
                key = $key
                inserted_id_present = [bool]$create.body.data.id
                error = $create.error
                body = $create.body
            }

            $flagsAfter = Invoke-JsonRequest -Method GET -Uri "$baseUrl/api/admin/feature-flags" -WebSession $session -TimeoutSec 35
            $found = $false
            if ($flagsAfter.body.data) {
                foreach ($flag in $flagsAfter.body.data) {
                    if ($flag.key -eq $key) { $found = $true }
                }
            }
            Add-AuditCheck $result "admin_db_verify_test_feature_flag" ($(if ($flagsAfter.ok -and $found) { "PASS" } else { "FAIL" })) @{
                status = $flagsAfter.status
                ok = $flagsAfter.ok
                key = $key
                found = $found
                error = $flagsAfter.error
            }
        }
    }
} catch {
    Add-AuditError $result "production_admin_db_unhandled" $_
}

Write-AuditResult (Complete-AuditResult $result)

