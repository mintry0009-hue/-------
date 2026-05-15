$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $root "frontend")

Write-Host "프론트엔드 서버를 시작합니다: http://127.0.0.1:5173" -ForegroundColor Cyan
node server.js
