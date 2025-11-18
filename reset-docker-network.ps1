# Complete Docker Desktop Network Fix
# Run this step by step

Write-Host "🔧 Docker Desktop Network Troubleshooting" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

Write-Host "Step 1: Checking Docker Desktop status..." -ForegroundColor Yellow
docker version

Write-Host ""
Write-Host "Step 2: Checking Docker network mode..." -ForegroundColor Yellow
docker info | Select-String -Pattern "Operating System|OSType"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "🔧 Applying Fixes..." -ForegroundColor Cyan
Write-Host ""

Write-Host "Fix 1: Resetting WSL..." -ForegroundColor Yellow
wsl --shutdown
Start-Sleep -Seconds 3

Write-Host "Fix 2: Flushing DNS cache..." -ForegroundColor Yellow
ipconfig /flushdns

Write-Host "Fix 3: Restarting Docker Desktop..." -ForegroundColor Yellow
Stop-Process -Name "Docker Desktop" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "com.docker.backend" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "com.docker.proxy" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 5

Write-Host "Starting Docker Desktop..." -ForegroundColor Yellow
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

Write-Host ""
Write-Host "⏳ Waiting for Docker to start (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "✅ Docker should be restarting..." -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Wait for Docker Desktop icon to show 'Running' in system tray" -ForegroundColor White
Write-Host "2. Run this test:" -ForegroundColor White
Write-Host "   docker run --rm alpine ping -c 1 8.8.8.8" -ForegroundColor Green
Write-Host "3. If that works, test DNS:" -ForegroundColor White
Write-Host "   docker run --rm alpine nslookup google.com 8.8.8.8" -ForegroundColor Green
Write-Host ""
