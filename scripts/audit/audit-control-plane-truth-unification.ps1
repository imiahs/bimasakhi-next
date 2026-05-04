. "$PSScriptRoot\_AuditUtils.ps1"
Import-AuditEnv
$result = New-AuditResult "control-plane-truth-unification-ps"

function Normalize-RestRows($Body) {
    if ($null -eq $Body) { return @() }
    $json = $Body | ConvertTo-Json -Depth 20 -Compress
    if ([string]::IsNullOrWhiteSpace($json)) { return @() }
    $parsed = $json | ConvertFrom-Json
    if ($parsed -is [System.Array]) { return ,@($parsed) }
    if ($parsed.PSObject.Properties.Name -contains 'value' -and $parsed.value -is [System.Array]) {
        return ,@($parsed.value)
    }
    return ,@($parsed)
}

function Get-FlagMatches($Flags, [string]$Key) {
    return ,@($Flags | Where-Object { $_.key -eq $Key })
}

try {
    Add-AuditCheck $result "env_presence_masked" "INFO" (Get-EnvPresence @("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_PASSWORD"))

    $supabaseUrl = Get-SupabaseUrl
    $headers = Get-SupabaseHeaders
    $baseRestUrl = "$supabaseUrl/rest/v1"
    $baseUrl = Get-BaseUrl
    $controlKeys = @("safe_mode", "pagegen_enabled", "bulk_generation_enabled")

    $controlResponse = Invoke-JsonRequest -Method GET -Uri "$baseRestUrl/system_control_config?select=singleton_key,system_mode,safe_mode,ai_enabled,queue_paused,crm_auto_routing,followup_enabled,pagegen_enabled,bulk_generation_enabled,updated_at&limit=1" -Headers $headers -TimeoutSec 35
    $controlRows = @(Normalize-RestRows $controlResponse.body)
    $controlRow = if ($controlRows.Count -gt 0) { $controlRows[0] } else { $null }
    $controlColumnsPresent = $null -ne $controlRow
    foreach ($key in $controlKeys) {
        if ($null -eq $controlRow -or -not ($controlRow.PSObject.Properties.Name -contains $key)) {
            $controlColumnsPresent = $false
        }
    }

    Add-AuditCheck $result "direct_rest_control_plane_row" ($(if ($controlResponse.ok -and $controlColumnsPresent) { "PASS" } else { "FAIL" })) @{
        method = "GET"
        auth_mode = "SUPABASE_SERVICE_ROLE_KEY"
        transport = "curl.exe via Invoke-CurlJsonRequest"
        rest_uri = "$baseRestUrl/system_control_config?select=singleton_key,system_mode,safe_mode,ai_enabled,queue_paused,crm_auto_routing,followup_enabled,pagegen_enabled,bulk_generation_enabled,updated_at&limit=1"
        status = $controlResponse.status
        control_columns_present = $controlColumnsPresent
        row = $controlRow
        error = $controlResponse.error
    }

    $legacyUri = "$baseRestUrl/feature_flags?select=key,value,restricted&key=in.(safe_mode,pagegen_enabled,bulk_generation_enabled)&order=key.asc"
    $legacyResponse = Invoke-JsonRequest -Method GET -Uri $legacyUri -Headers $headers -TimeoutSec 35
    $legacyRows = @(Normalize-RestRows $legacyResponse.body)
    $legacyAbsent = $legacyResponse.ok -and $legacyRows.Count -eq 0

    Add-AuditCheck $result "direct_rest_legacy_control_keys_absent" ($(if ($legacyAbsent) { "PASS" } else { "FAIL" })) @{
        method = "GET"
        auth_mode = "SUPABASE_SERVICE_ROLE_KEY"
        transport = "curl.exe via Invoke-CurlJsonRequest"
        rest_uri = $legacyUri
        status = $legacyResponse.status
        row_count = $legacyRows.Count
        rows = $legacyRows
        error = $legacyResponse.error
    }

    $adminPassword = [Environment]::GetEnvironmentVariable("ADMIN_PASSWORD", "Process")
    if (-not $adminPassword) {
        Add-AuditCheck $result "admin_login" "FAIL" @{ reason = "ADMIN_PASSWORD missing" }
    } else {
        $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
        $login = Invoke-JsonRequest -Method POST -Uri "$baseUrl/api/admin/login" -Headers @{ "Content-Type" = "application/json"; Origin = $baseUrl } -Body (Get-AdminLoginBody $adminPassword) -WebSession $session -TimeoutSec 35
        $loginPassed = $login.ok -and $session.Cookies.Count -gt 0

        Add-AuditCheck $result "admin_login" ($(if ($loginPassed) { "PASS" } else { "FAIL" })) @{
            status = $login.status
            ok = $login.ok
            cookie_count = $session.Cookies.Count
            error = $login.error
            body = $login.body
        }

        if ($loginPassed) {
            $flagsResponse = Invoke-JsonRequest -Method GET -Uri "$baseUrl/api/admin/feature-flags" -WebSession $session -TimeoutSec 35
            $flagRows = if ($flagsResponse.ok -and $flagsResponse.body.success -and $flagsResponse.body.data) { @($flagsResponse.body.data) } else { @() }
            $adminSingleSource = $true
            $flagEvidence = [ordered]@{}

            foreach ($key in $controlKeys) {
                $matches = Get-FlagMatches $flagRows $key
                $matchesCount = $matches.Count
                $match = if ($matchesCount -gt 0) { $matches[0] } else { $null }
                $valueMatchesRest = $null -ne $controlRow -and $null -ne $match -and ($match.value -eq $controlRow.$key)
                $singleSource = $matchesCount -eq 1 -and $match.source -eq 'system_control_config' -and $valueMatchesRest
                if (-not $singleSource) { $adminSingleSource = $false }

                $flagEvidence[$key] = [ordered]@{
                    count = $matchesCount
                    source = if ($match) { $match.source } else { $null }
                    value = if ($match) { $match.value } else { $null }
                    rest_value = if ($controlRow) { $controlRow.$key } else { $null }
                    value_matches_rest = $valueMatchesRest
                }
            }

            Add-AuditCheck $result "admin_feature_flags_single_source" ($(if ($flagsResponse.ok -and $flagsResponse.body.success -and $adminSingleSource) { "PASS" } else { "FAIL" })) @{
                status = $flagsResponse.status
                ok = $flagsResponse.ok
                success = $flagsResponse.body.success
                canonical_keys = $flagEvidence
                error = $flagsResponse.error
            }

            $healthResponse = Invoke-JsonRequest -Method GET -Uri "$baseUrl/api/admin/system/health" -WebSession $session -TimeoutSec 40
            $healthBody = $healthResponse.body
            $controlPlane = if ($healthBody -and $healthBody.control_plane) { $healthBody.control_plane } else { $null }
            $healthSingleSource = $healthResponse.ok -and $healthBody.success -and $null -ne $controlPlane -and
                $controlPlane.control_plane_source -eq 'system_control_config' -and
                $controlPlane.system_mode_source -eq 'system_control_config' -and
                $controlPlane.operational_flags_source -eq 'system_control_config' -and
                $controlPlane.safe_mode_source -eq 'system_control_config' -and
                $controlPlane.conflicting_states_possible -eq $false

            Add-AuditCheck $result "admin_system_health_single_source" ($(if ($healthSingleSource) { "PASS" } else { "FAIL" })) @{
                status = $healthResponse.status
                ok = $healthResponse.ok
                success = $healthBody.success
                control_plane = $controlPlane
                error = $healthResponse.error
            }
        }
    }

    $requiredChecks = @(
        'direct_rest_control_plane_row',
        'direct_rest_legacy_control_keys_absent',
        'admin_login',
        'admin_feature_flags_single_source',
        'admin_system_health_single_source'
    )
    $allPassed = $true
    foreach ($checkName in $requiredChecks) {
        $check = @($result.checks | Where-Object { $_.name -eq $checkName }) | Select-Object -First 1
        if ($null -eq $check -or $check.status -ne 'PASS') {
            $allPassed = $false
        }
    }

    Add-AuditCheck $result "control_plane_truth_unification_verdict" ($(if ($allPassed) { "PASS" } else { "FAIL" })) @{
        canonical_source = 'system_control_config'
        legacy_duplicate_keys_absent = $legacyAbsent
        conflicting_states_possible = $false
        runtime_control_keys = $controlKeys
        required_checks = $requiredChecks
        all_required_checks_passed = $allPassed
    }
} catch {
    Add-AuditError $result "control_plane_truth_unification_unhandled" $_
}

Write-AuditResult (Complete-AuditResult $result)