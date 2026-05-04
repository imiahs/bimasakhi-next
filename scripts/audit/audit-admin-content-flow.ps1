. "$PSScriptRoot\_AuditUtils.ps1"
Import-AuditEnv
$result = New-AuditResult "admin-content-flow-ps"

try {
    Add-AuditCheck $result "env_presence_masked" "INFO" (Get-EnvPresence @("ADMIN_PASSWORD","SUPABASE_SERVICE_ROLE_KEY"))
    $baseUrl = Get-BaseUrl
    $draftSlug = "$($Script:TestPrefix)draft-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())".ToLower()

    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $adminPassword = [Environment]::GetEnvironmentVariable("ADMIN_PASSWORD", "Process")
    if ($adminPassword) {
        $login = Invoke-JsonRequest -Method POST -Uri "$baseUrl/api/admin/login" -Headers @{ "Content-Type" = "application/json"; Origin = $baseUrl } -Body (Get-AdminLoginBody $adminPassword) -WebSession $session -TimeoutSec 35
        Add-AuditCheck $result "admin_login_for_content_api" ($(if ($login.ok -and $session.Cookies.Count -gt 0) { "PASS" } else { "FAIL" })) @{
            status = $login.status
            ok = $login.ok
            cookie_count = $session.Cookies.Count
            body = $login.body
            error = $login.error
        }
    } else {
        Add-AuditCheck $result "admin_login_for_content_api" "FAIL" @{ reason = "ADMIN_PASSWORD missing" }
    }

    if ($session.Cookies.Count -gt 0) {
        $create = Invoke-JsonRequest -Method POST -Uri "$baseUrl/api/admin/ccc/drafts" -Headers @{ "Content-Type" = "application/json"; Origin = $baseUrl } -Body (@{ action = "create_blank" } | ConvertTo-Json) -WebSession $session -TimeoutSec 35
        $draftId = if ($create.ok -and $create.body.success) { $create.body.draft.id } else { $null }
        Add-AuditCheck $result "draft_create_admin_api" ($(if ($draftId) { "PASS" } else { "FAIL" })) @{
            status = $create.status
            ok = $create.ok
            draft_id = $draftId
            body = $create.body
            error = $create.error
        }

        if (-not $draftId) {
            Write-AuditResult (Complete-AuditResult $result)
            exit
        }

        $updatePayload = @{
            page_title = "$($Script:TestPrefix) Draft Runtime Audit"
            meta_title = "$($Script:TestPrefix) Meta Title"
            meta_description = "$($Script:TestPrefix) Meta Description"
            hero_headline = "$($Script:TestPrefix) Draft Runtime Audit"
            body_content = "<p>$($Script:TestPrefix) body content for live audit.</p>"
            cta_text = "Apply Now"
            status = "draft"
        }
        $update = Invoke-JsonRequest -Method PATCH -Uri "$baseUrl/api/admin/ccc/drafts/$draftId" -Headers @{ "Content-Type" = "application/json"; Origin = $baseUrl } -Body ($updatePayload | ConvertTo-Json) -WebSession $session -TimeoutSec 35
        Add-AuditCheck $result "draft_update_admin_api" ($(if ($update.ok -and $update.body.success) { "PASS" } else { "FAIL" })) @{
            status = $update.status
            ok = $update.ok
            body = $update.body
            error = $update.error
            note = "API does not expose slug update, so generated draft slug is used for publish test."
        }

        $read = Invoke-JsonRequest -Method GET -Uri "$baseUrl/api/admin/ccc/drafts/$draftId" -WebSession $session -TimeoutSec 35
        $actualSlug = if ($read.ok -and $read.body.draft.slug) { $read.body.draft.slug } else { $draftSlug }
        Add-AuditCheck $result "draft_api_read" ($(if ($read.ok) { "PASS" } else { "FAIL" })) @{
            status = $read.status
            ok = $read.ok
            body = $read.body
            error = $read.error
            actual_slug = $actualSlug
        }

        $publish = Invoke-JsonRequest -Method PATCH -Uri "$baseUrl/api/admin/ccc/drafts/$draftId" -Headers @{ "Content-Type" = "application/json"; Origin = $baseUrl } -Body (@{ action = "approve" } | ConvertTo-Json) -WebSession $session -TimeoutSec 45
        Add-AuditCheck $result "publish_api_approve" ($(if ($publish.ok) { "PASS" } else { "FAIL" })) @{
            status = $publish.status
            ok = $publish.ok
            body = $publish.body
            error = $publish.error
        }

        $readAfter = Invoke-JsonRequest -Method GET -Uri "$baseUrl/api/admin/ccc/drafts/$draftId" -WebSession $session -TimeoutSec 35
        Add-AuditCheck $result "publish_admin_api_verify_draft_status" ($(if ($readAfter.ok -and $readAfter.body.draft.status -eq "published" -and $readAfter.body.draft.page_index_id) { "PASS" } else { "FAIL" })) @{
            status = $readAfter.status
            ok = $readAfter.ok
            draft_status = $readAfter.body.draft.status
            page_index_id_present = [bool]$readAfter.body.draft.page_index_id
            published_at = $readAfter.body.draft.published_at
            body = $readAfter.body
            error = $readAfter.error
        }

        $live = Invoke-JsonRequest -Method GET -Uri "$baseUrl/$actualSlug" -TimeoutSec 45
        $bodyText = if ($live.body -is [string]) { $live.body } else { $live.body | ConvertTo-Json -Depth 8 }
        Add-AuditCheck $result "published_live_url_render" ($(if ($live.ok -and $bodyText.Contains($Script:TestPrefix)) { "PASS" } else { "FAIL" })) @{
            status = $live.status
            ok = $live.ok
            actual_slug = $actualSlug
            contains_marker = $bodyText.Contains($Script:TestPrefix)
            body_sample = $bodyText.Substring(0, [Math]::Min(350, $bodyText.Length))
            error = $live.error
        }
    }
} catch {
    Add-AuditError $result "admin_content_flow_unhandled" $_
}

Write-AuditResult (Complete-AuditResult $result)
