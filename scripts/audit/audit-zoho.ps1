. "$PSScriptRoot\_AuditUtils.ps1"
Import-AuditEnv
$result = New-AuditResult "zoho-ps"

try {
    Add-AuditCheck $result "env_presence_masked" "INFO" (Get-EnvPresence @("ZOHO_CLIENT_ID","ZOHO_CLIENT_SECRET","ZOHO_REFRESH_TOKEN","ZOHO_API_DOMAIN"))
    $clientId = [Environment]::GetEnvironmentVariable("ZOHO_CLIENT_ID", "Process")
    $clientSecret = [Environment]::GetEnvironmentVariable("ZOHO_CLIENT_SECRET", "Process")
    $refreshToken = [Environment]::GetEnvironmentVariable("ZOHO_REFRESH_TOKEN", "Process")
    $apiDomain = [Environment]::GetEnvironmentVariable("ZOHO_API_DOMAIN", "Process")
    if (-not $apiDomain) { $apiDomain = "https://www.zohoapis.in" }
    $accounts = if ($apiDomain.Contains(".in")) { "https://accounts.zoho.in" } else { "https://accounts.zoho.com" }

    if (-not $clientId -or -not $clientSecret -or -not $refreshToken) {
        Add-AuditCheck $result "zoho_configured" "FAIL" @{ missing = @("ZOHO_CLIENT_ID","ZOHO_CLIENT_SECRET","ZOHO_REFRESH_TOKEN") | Where-Object { -not [Environment]::GetEnvironmentVariable($_, "Process") } }
    } else {
        $tokenUri = "$accounts/oauth/v2/token?refresh_token=$([System.Uri]::EscapeDataString($refreshToken))&client_id=$([System.Uri]::EscapeDataString($clientId))&client_secret=$([System.Uri]::EscapeDataString($clientSecret))&grant_type=refresh_token"
        $tokenRes = Invoke-JsonRequest -Method POST -Uri $tokenUri -TimeoutSec 35
        $accessToken = $tokenRes.body.access_token
        Add-AuditCheck $result "zoho_access_token_refresh" ($(if ($tokenRes.ok -and $accessToken) { "PASS" } else { "FAIL" })) @{
            status = $tokenRes.status
            token_present = [bool]$accessToken
            response_keys = if ($tokenRes.body -is [string]) { @() } else { $tokenRes.body.PSObject.Properties.Name }
            error = $tokenRes.body.error
        }

        if ($accessToken) {
            $marker = "$($Script:TestPrefix)ZOHO_$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
            $payload = @{
                data = @(@{
                    Last_Name = $marker
                    First_Name = "Audit"
                    Company = "BimaSakhi Audit"
                    Email = "test.audit.$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())@example.com"
                    Phone = "9999999999"
                    Lead_Source = "TEST_AUDIT_LIVE_SYSTEM_AUDIT"
                    Description = "$marker safe audit lead. Can be deleted by CRM admin after verification."
                })
                duplicate_check_fields = @("Email")
            }
            $crm = Invoke-JsonRequest -Method POST -Uri "$apiDomain/crm/v2.1/Leads/upsert" -Headers @{
                Authorization = "Zoho-oauthtoken $accessToken"
                "Content-Type" = "application/json"
            } -Body $payload -TimeoutSec 45
            $item = if ($crm.body.data -and $crm.body.data.Count -gt 0) { $crm.body.data[0] } else { $null }
            Add-AuditCheck $result "zoho_test_lead_upsert" ($(if ($crm.ok -and $item.status -eq "success") { "PASS" } else { "FAIL" })) @{
                status = $crm.status
                crm_status = $item.status
                action = $item.action
                zoho_id_present = [bool]$item.details.id
                marker = $marker
                code = $item.code
                message = $item.message
                error = $crm.error
                body = $crm.body
            }
        }
    }
} catch {
    Add-AuditError $result "zoho_unhandled" $_
}

Write-AuditResult (Complete-AuditResult $result)

