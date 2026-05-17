param(
  [string]$SshHost = "prolific-cloud",
  [string]$RemoteRoot = "/www/htdocs/w021974e/prolific.nickkrakow.de",
  [switch]$DryRun,
  [switch]$SkipChecks,
  [switch]$IncludeConfig
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$runtimeFiles = @(
  ".htaccess",
  "api/_common.php",
  "api/data.php",
  "api/sync.php",
  "dashboard/app.php",
  "dashboard/favicon.ico",
  "dashboard/index.php",
  "dashboard/logout.php",
  "dashboard/session.php",
  "dashboard/assets/app.js",
  "dashboard/assets/style.css"
)

if ($IncludeConfig) {
  Write-Warning "Including config.php in deployment because -IncludeConfig was specified."
  $runtimeFiles += "config.php"
}

$remoteDirs = @(
  $RemoteRoot,
  "$RemoteRoot/api",
  "$RemoteRoot/dashboard",
  "$RemoteRoot/dashboard/assets"
)

function Assert-FileExists([string]$path) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Required runtime file is missing: $path"
  }
}

function Invoke-Checked([string]$label, [string[]]$command) {
  Write-Host "==> $label"
  if ($DryRun) {
    Write-Host ("DRY RUN: " + ($command -join " "))
    return
  }

  & $command[0] @($command | Select-Object -Skip 1)
  if ($LASTEXITCODE -ne 0) {
    throw "$label failed with exit code $LASTEXITCODE"
  }
}

foreach ($file in $runtimeFiles) {
  Assert-FileExists $file
}

if (-not $SkipChecks) {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($node) {
    Invoke-Checked "Check dashboard JavaScript syntax" @("node", "--check", "dashboard/assets/app.js")
  } else {
    Write-Warning "node is not available locally; skipping JavaScript syntax check."
  }
}

$mkdirCommand = "mkdir -p " + (($remoteDirs | ForEach-Object { "'" + $_ + "'" }) -join " ")
Invoke-Checked "Ensure remote directories exist" @("ssh", $SshHost, $mkdirCommand)

foreach ($file in $runtimeFiles) {
  $remotePath = "$RemoteRoot/$($file -replace '\\', '/')"
  Invoke-Checked "Upload $file" @("scp", "-p", $file, "${SshHost}:$remotePath")
}

Write-Host "Deployment finished: ${SshHost}:$RemoteRoot"
