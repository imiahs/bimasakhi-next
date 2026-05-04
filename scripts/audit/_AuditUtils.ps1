$Script:AuditRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Script:ResultsRoot = Join-Path $Script:AuditRoot "results"
$Script:TestPrefix = "TEST_AUDIT_"

function Import-AuditEnv {
    $envPath = Join-Path (Get-Location) ".env.local"
    if (-not (Test-Path -LiteralPath $envPath)) {
        throw ".env.local not found at $envPath"
    }

    Get-Content -LiteralPath $envPath | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
            $key = $Matches[1]
            $value = $Matches[2].Trim()
            if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            if (-not [Environment]::GetEnvironmentVariable($key, "Process")) {
                [Environment]::SetEnvironmentVariable($key, $value, "Process")
            }
        }
    }
}

function Mask-Secret([string]$Value) {
    if ([string]::IsNullOrEmpty($Value)) { return $null }
    if ($Value.Length -le 8) { return ("*" * $Value.Length) + " ($($Value.Length) chars)" }
    return "$($Value.Substring(0,4))...$($Value.Substring($Value.Length-4)) ($($Value.Length) chars)"
}

function Get-EnvPresence([string[]]$Keys) {
    $map = [ordered]@{}
    foreach ($key in $Keys) {
        $value = [Environment]::GetEnvironmentVariable($key, "Process")
        $map[$key] = [ordered]@{
            present = -not [string]::IsNullOrEmpty($value)
            masked = Mask-Secret $value
        }
    }
    return $map
}

function New-AuditResult([string]$Name) {
    return [ordered]@{
        name = $Name
        started_at = (Get-Date).ToUniversalTime().ToString("o")
        finished_at = $null
        status = "UNKNOWN"
        checks = New-Object System.Collections.ArrayList
        errors = New-Object System.Collections.ArrayList
    }
}

function Add-AuditCheck($Result, [string]$Name, [string]$Status, $Evidence) {
    [void]$Result.checks.Add([ordered]@{
        name = $Name
        status = $Status
        evidence = $Evidence
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
    })
}

function Add-AuditError($Result, [string]$Name, $ErrorRecord) {
    [void]$Result.errors.Add([ordered]@{
        name = $Name
        message = if ($ErrorRecord.Exception) { $ErrorRecord.Exception.Message } else { "$ErrorRecord" }
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
    })
}

function Complete-AuditResult($Result) {
    $Result.finished_at = (Get-Date).ToUniversalTime().ToString("o")
    if ($Result.errors.Count -gt 0) {
        $hasPass = $false
        foreach ($check in $Result.checks) { if ($check.status -eq "PASS") { $hasPass = $true } }
        $Result.status = if ($hasPass) { "PARTIAL" } else { "FAIL" }
    } else {
        $hasFail = $false
        foreach ($check in $Result.checks) { if ($check.status -eq "FAIL") { $hasFail = $true } }
        $Result.status = if ($hasFail) { "PARTIAL" } else { "PASS" }
    }
    return $Result
}

function Write-AuditResult($Result) {
    if (-not (Test-Path -LiteralPath $Script:ResultsRoot)) {
        New-Item -ItemType Directory -Path $Script:ResultsRoot | Out-Null
    }
    $safeTime = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH-mm-ss-fffZ")
    $file = Join-Path $Script:ResultsRoot "$safeTime-$($Result.name).json"
    $json = $Result | ConvertTo-Json -Depth 20
    Set-Content -LiteralPath $file -Value $json -Encoding UTF8
    Write-Output $json
    Write-Output "RESULT_FILE=$file"
}

function Get-BaseUrl {
    $site = [Environment]::GetEnvironmentVariable("NEXT_PUBLIC_SITE_URL", "Process")
    if ([string]::IsNullOrWhiteSpace($site)) { $site = "https://bimasakhi.com" }
    return $site.TrimEnd("/")
}

function Get-AdminEmail {
    $email = [Environment]::GetEnvironmentVariable("ADMIN_EMAIL", "Process")
    if ([string]::IsNullOrWhiteSpace($email)) { $email = "admin@bimasakhi.com" }
    return $email.Trim().ToLower()
}

function Get-AdminLoginBody([string]$Password) {
    return @{
        email = Get-AdminEmail
        password = $Password
    } | ConvertTo-Json
}

function Get-SupabaseHeaders {
    $key = [Environment]::GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY", "Process")
    if ([string]::IsNullOrWhiteSpace($key)) { throw "SUPABASE_SERVICE_ROLE_KEY missing" }
    return @{
        apikey = $key
        Authorization = "Bearer $key"
        "Content-Type" = "application/json"
        Prefer = "return=representation"
    }
}

function Get-SupabaseUrl {
    $url = [Environment]::GetEnvironmentVariable("SUPABASE_URL", "Process")
    if ([string]::IsNullOrWhiteSpace($url)) {
        $url = [Environment]::GetEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL", "Process")
    }
    if ([string]::IsNullOrWhiteSpace($url)) { throw "Supabase URL missing" }
    return $url.TrimEnd("/")
}

function Invoke-CurlJsonRequest {
    param(
        [string]$Method,
        [string]$Uri,
        $Headers = @{},
        $Body = $null,
        [int]$TimeoutSec = 30
    )

    $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
    if (-not $curl) {
        throw "curl.exe is required for direct Supabase REST probes on this host"
    }

    $bodyFile = [System.IO.Path]::GetTempFileName()
    $headerFile = [System.IO.Path]::GetTempFileName()

    try {
        $args = @(
            '-sS',
            '--request', $Method,
            '--max-time', [string]$TimeoutSec,
            '--dump-header', $headerFile,
            '--output', $bodyFile,
            '--write-out', '%{http_code}'
        )

        if ($Headers) {
            foreach ($header in $Headers.GetEnumerator()) {
                $args += @('-H', "$($header.Key): $($header.Value)")
            }
        }

        if ($null -ne $Body) {
            $payload = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Depth 12 -Compress }
            $args += @('--data-raw', $payload)
        }

        $statusText = & $curl.Source @args $Uri
        $status = 0
        [void][int]::TryParse(($statusText | Out-String).Trim(), [ref]$status)

        $content = if (Test-Path -LiteralPath $bodyFile) { Get-Content -LiteralPath $bodyFile -Raw } else { '' }
        $parsed = $content
        if (-not [string]::IsNullOrWhiteSpace($content)) {
            try { $parsed = $content | ConvertFrom-Json } catch { $parsed = $content }
        }

        return [ordered]@{
            ok = $status -ge 200 -and $status -lt 300
            status = $status
            body = $parsed
            headers = @{}
            error = if ($status -ge 200 -and $status -lt 300) { $null } else { "curl.exe returned HTTP $status" }
        }
    } catch {
        return [ordered]@{
            ok = $false
            status = $null
            body = $null
            headers = @{}
            error = $_.Exception.Message
        }
    } finally {
        Remove-Item -LiteralPath $bodyFile, $headerFile -Force -ErrorAction SilentlyContinue
    }
}

function Invoke-JsonRequest {
    param(
        [string]$Method,
        [string]$Uri,
        $Headers = @{},
        $Body = $null,
        [int]$TimeoutSec = 30,
        [Microsoft.PowerShell.Commands.WebRequestSession]$WebSession = $null
    )

    $isSupabaseRestProbe = $Uri -like '*/rest/v1/*' -and $Headers -and -not [string]::IsNullOrWhiteSpace($Headers['apikey'])
    if ($isSupabaseRestProbe) {
        return Invoke-CurlJsonRequest -Method $Method -Uri $Uri -Headers $Headers -Body $Body -TimeoutSec $TimeoutSec
    }

    $params = @{
        Method = $Method
        Uri = $Uri
        Headers = $Headers
        TimeoutSec = $TimeoutSec
        UseBasicParsing = $true
        ErrorAction = "Stop"
    }
    if ($null -ne $Body) {
        $params.Body = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Depth 12 }
    }
    if ($WebSession) { $params.WebSession = $WebSession }

    try {
        $response = Invoke-WebRequest @params
        $content = $response.Content
        $parsed = $content
        try { $parsed = $content | ConvertFrom-Json } catch { $parsed = $content }
        return [ordered]@{ ok = $true; status = [int]$response.StatusCode; body = $parsed; headers = $response.Headers }
    } catch {
        $status = $null
        $body = $null
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $body = $reader.ReadToEnd()
            } catch {}
        }
        return [ordered]@{ ok = $false; status = $status; body = $body; error = $_.Exception.Message }
    }
}
