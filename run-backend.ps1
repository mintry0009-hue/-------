$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $root "backend")

Write-Host "백엔드 서버를 시작합니다: http://127.0.0.1:4000" -ForegroundColor Cyan
node src/server.js
