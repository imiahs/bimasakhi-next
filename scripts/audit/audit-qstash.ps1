. "$PSScriptRoot\_AuditUtils.ps1"
Import-AuditEnv
$result = New-AuditResult "qstash-ps"

try {
    Add-AuditCheck $result "env_presence_masked" "INFO" (Get-EnvPresence @("QSTASH_TOKEN"))
    $token = [Environment]::GetEnvironmentVariable("QSTASH_TOKEN", "Process")
    if (-not $token) {
        Add-AuditCheck $result "qstash_configured" "FAIL" @{ reason = "QSTASH_TOKEN missing" }
    } else {
        $targetUrl = "$(Get-BaseUrl)/api/test"
        $target = [System.Uri]::EscapeUriString($targetUrl)
        $marker = "$($Script:TestPrefix)QSTASH_$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
        $publish = Invoke-JsonRequest -Method POST -Uri "https://qstash.upstash.io/v2/publish/$target" -Headers @{
            Authorization = "Bearer $token"
            "Content-Type" = "application/json"
        } -Body @{ marker = $marker; audit = $true } -TimeoutSec 35
        $messageId = if ($publish.body.messageId) { $publish.body.messageId } else { $null }
        Add-AuditCheck $result "publish_test_message" ($(if ($publish.ok -and $messageId) { "PASS" } else { "FAIL" })) @{
            status = $publish.status
            target_url = $targetUrl
            message_id = $messageId
            marker = $marker
            body = $publish.body
            error = $publish.error
        }

        Start-Sleep -Seconds 8
        $logs = Invoke-JsonRequest -Method GET -Uri "https://qstash.upstash.io/v2/logs" -Headers @{ Authorization = "Bearer $token" } -TimeoutSec 35
        $serialized = $logs.body | ConvertTo-Json -Depth 12
        $found = $messageId -and $serialized.Contains($messageId)
        Add-AuditCheck $result "delivery_log_lookup" ($(if ($logs.ok -and $found) { "PASS" } elseif ($logs.ok) { "PARTIAL" } else { "FAIL" })) @{
            status = $logs.status
            logs_api_ok = $logs.ok
            message_id_found = [bool]$found
            body_sample = $serialized.Substring(0, [Math]::Min(700, $serialized.Length))
            error = $logs.error
        }
    }
} catch {
    Add-AuditError $result "qstash_unhandled" $_
}

Write-AuditResult (Complete-AuditResult $result)
