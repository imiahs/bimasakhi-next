. "$PSScriptRoot\_AuditUtils.ps1"
Import-AuditEnv
$result = New-AuditResult "supabase-direct-rest-read-ps"

function Normalize-RestRows($Body) {
    if ($null -eq $Body) { return @() }
    $json = $Body | ConvertTo-Json -Depth 20 -Compress
    if ([string]::IsNullOrWhiteSpace($json)) { return @() }
    $parsed = $json | ConvertFrom-Json
    if ($parsed -is [System.Array]) { return @($parsed) }
    if ($parsed.PSObject.Properties.Name -contains 'value' -and $parsed.value -is [System.Array]) {
        return @($parsed.value)
    }
    return @($parsed)
}

try {
    Add-AuditCheck $result "env_presence_masked" "INFO" (Get-EnvPresence @("SUPABASE_URL","NEXT_PUBLIC_SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY"))

    $supabaseUrl = Get-SupabaseUrl
    $headers = Get-SupabaseHeaders
    $baseRestUrl = "$supabaseUrl/rest/v1"

    $queries = @(
        @{
            name = "system_control_config"
            uri = "$baseRestUrl/system_control_config?select=singleton_key,system_mode,ai_enabled,followup_enabled,updated_at&limit=1"
            critical = $true
        },
        @{
            name = "feature_flags"
            uri = "$baseRestUrl/feature_flags?select=key,value,restricted,last_changed_at&order=key.asc&limit=5"
            critical = $true
        },
        @{
            name = "system_alerts"
            uri = "$baseRestUrl/system_alerts?select=alert_type,severity,resolved,created_at&order=created_at.desc&limit=5"
            critical = $true
        },
        @{
            name = "job_dead_letters"
            uri = "$baseRestUrl/job_dead_letters?select=job_class,failed_at&order=failed_at.desc&limit=5"
            critical = $true
        },
        @{
            name = "event_store"
            uri = "$baseRestUrl/event_store?select=id,event_name,status,priority,created_at&order=created_at.desc&limit=5"
            critical = $true
        }
    )

    foreach ($query in $queries) {
        $response = Invoke-JsonRequest -Method GET -Uri $query.uri -Headers $headers -TimeoutSec 35
        $rows = Normalize-RestRows $response.body
        $sample = if ($rows.Count -gt 3) { @($rows | Select-Object -First 3) } else { $rows }

        Add-AuditCheck $result "direct_rest_read_$($query.name)" ($(if ($response.ok) { "PASS" } else { "FAIL" })) @{
            critical = $query.critical
            method = "GET"
            transport = "curl.exe via Invoke-CurlJsonRequest"
            auth_mode = "SUPABASE_SERVICE_ROLE_KEY"
            rest_uri = $query.uri
            status = $response.status
            row_count = $rows.Count
            body_sample = $sample
            error = $response.error
        }
    }

    $allCriticalReadsPassed = ($result.checks | Where-Object { $_.name -like 'direct_rest_read_*' -and $_.evidence.critical }).Count -gt 0 -and
        -not ($result.checks | Where-Object { $_.name -like 'direct_rest_read_*' -and $_.status -ne 'PASS' })

    Add-AuditCheck $result "read_only_verdict" ($(if ($allCriticalReadsPassed) { "PASS" } else { "FAIL" })) @{
        mode = "read_only"
        outside_app_layer = $true
        transport = "direct_supabase_rest"
        critical_tables = @("system_control_config", "feature_flags", "system_alerts", "job_dead_letters", "event_store")
        all_critical_reads_passed = $allCriticalReadsPassed
    }
} catch {
    Add-AuditError $result "supabase_direct_rest_read_unhandled" $_
}

Write-AuditResult (Complete-AuditResult $result)