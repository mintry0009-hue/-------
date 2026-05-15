$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$cloudflared = Join-Path $root "tools\cloudflared\cloudflared.exe"

if (-not (Test-Path $cloudflared)) {
  Write-Host "cloudflared 실행 파일을 찾을 수 없습니다: $cloudflared" -ForegroundColor Red
  exit 1
}

Write-Host "Cloudflare Quick Tunnel을 시작합니다..." -ForegroundColor Cyan
Write-Host "이 창을 닫으면 공개 주소도 함께 종료됩니다." -ForegroundColor Yellow
Write-Host ""

& $cloudflared tunnel --url http://127.0.0.1:5173
