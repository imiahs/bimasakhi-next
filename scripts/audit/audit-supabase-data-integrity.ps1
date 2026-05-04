. "$PSScriptRoot\_AuditUtils.ps1"
Import-AuditEnv
$result = New-AuditResult "supabase-data-integrity-ps"

try {
    Add-AuditCheck $result "env_presence_masked" "INFO" (Get-EnvPresence @("SUPABASE_URL","NEXT_PUBLIC_SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","SUPABASE_ENABLED"))
    $supabaseUrl = Get-SupabaseUrl
    $headers = Get-SupabaseHeaders

    $probe = Invoke-JsonRequest -Method GET -Uri "$supabaseUrl/rest/v1/system_control_config?select=singleton_key&limit=1" -Headers $headers
    Add-AuditCheck $result "db_query_system_control_config" ($(if ($probe.ok) { "PASS" } else { "FAIL" })) @{
        status = $probe.status
        ok = $probe.ok
        error = $probe.error
    }

    $marker = "$($Script:TestPrefix)SUPABASE_$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
    $insert = Invoke-JsonRequest -Method POST -Uri "$supabaseUrl/rest/v1/observability_logs?select=id,message,source,created_at" -Headers $headers -Body @{
        level = "INFO"
        source = "audit_live_validation"
        message = $marker
        metadata = @{ audit = $true; marker = $marker }
    }
    $insertedId = if ($insert.ok -and $insert.body.Count -gt 0) { $insert.body[0].id } else { $null }
    Add-AuditCheck $result "insert_test_observability_log" ($(if ($insert.ok -and $insertedId) { "PASS" } else { "FAIL" })) @{
        status = $insert.status
        inserted_id = $insertedId
        marker = $marker
        error = $insert.error
        body = $insert.body
    }

    if ($insertedId) {
        $verify = Invoke-JsonRequest -Method GET -Uri "$supabaseUrl/rest/v1/observability_logs?id=eq.$insertedId&select=id,message,source,created_at" -Headers $headers
        $found = $verify.ok -and $verify.body.Count -gt 0
        Add-AuditCheck $result "verify_inserted_observability_log" ($(if ($found -and $verify.body[0].message -eq $marker) { "PASS" } else { "FAIL" })) @{
            status = $verify.status
            found = $found
            message_matches = if ($found) { $verify.body[0].message -eq $marker } else { $false }
            error = $verify.error
        }
    }

    $failureSlug = "$($Script:TestPrefix)partial-write-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())".ToLower()
    $pageInsert = Invoke-JsonRequest -Method POST -Uri "$supabaseUrl/rest/v1/page_index?select=id,page_slug,status" -Headers $headers -Body @{
        page_slug = $failureSlug
        page_type = "audit_failure_simulation"
        status = "unpublished"
        created_at = (Get-Date).ToUniversalTime().ToString("o")
        updated_at = (Get-Date).ToUniversalTime().ToString("o")
    }
    $pageId = if ($pageInsert.ok -and $pageInsert.body.Count -gt 0) { $pageInsert.body[0].id } else { $null }
    $forcedFail = $null
    if ($pageId) {
        $forcedFail = Invoke-JsonRequest -Method POST -Uri "$supabaseUrl/rest/v1/location_content?select=id" -Headers $headers -Body @{
            page_index_id = $pageId
            hero_headline = $null
            local_opportunity_description = "$($Script:TestPrefix)forced failure should reject null headline"
        }
    }
    $after = Invoke-JsonRequest -Method GET -Uri "$supabaseUrl/rest/v1/page_index?page_slug=eq.$failureSlug&select=id,page_slug,status" -Headers $headers
    $orphanRemains = $after.ok -and $after.body.Count -gt 0
    Add-AuditCheck $result "rule16_partial_write_simulation" ($(if ($pageId) { "PASS" } else { "FAIL" })) @{
        page_inserted = [bool]$pageId
        page_id = $pageId
        forced_child_insert_failed = if ($forcedFail) { -not $forcedFail.ok } else { $null }
        forced_child_status = if ($forcedFail) { $forcedFail.status } else { $null }
        forced_child_error = if ($forcedFail) { $forcedFail.error } else { $null }
        orphan_page_remains = $orphanRemains
        verdict = if ($orphanRemains -and $forcedFail -and -not $forcedFail.ok) { "PARTIAL_WRITE_CONFIRMED" } else { "NO_PARTIAL_WRITE_OBSERVED_OR_INCONCLUSIVE" }
    }
} catch {
    Add-AuditError $result "supabase_data_integrity_unhandled" $_
}

Write-AuditResult (Complete-AuditResult $result)

