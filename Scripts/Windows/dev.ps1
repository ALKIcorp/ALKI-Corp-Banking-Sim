$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir "..\..")
Set-Location $RootDir

Write-Host "Starting Spring Boot (backend)..."
$mvn = Start-Process -FilePath "mvn" -ArgumentList "spring-boot:run" -NoNewWindow -PassThru

Set-Location (Join-Path $RootDir "frontend")

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing frontend dependencies..."
  npm install
}

Write-Host "Starting Vite (frontend)..."
$opened = $false
try {
  npm run dev | ForEach-Object {
    Write-Host $_
    if (-not $opened -and $_ -match 'http://(localhost|127\.0\.0\.1):\d+') {
      $url = $Matches[0]
      Write-Host "Opening $url"
      Start-Process $url
      $opened = $true
    }
  }
} finally {
  if ($mvn -and -not $mvn.HasExited) {
    Stop-Process -Id $mvn.Id
  }
}
