# Alternative Docker DNS Fix - Direct Container DNS Override
# This doesn't require admin privileges

Write-Host "🔧 Testing alternative DNS fix..." -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣ Testing direct DNS flag..." -ForegroundColor Yellow
$testCmd = 'docker run --rm --dns=8.8.8.8 --dns=1.1.1.1 python:3.9-slim python -c "import socket; print(''DNS Test:'', socket.gethostbyname(''google.com''))"'
Write-Host "Running: $testCmd" -ForegroundColor Gray
Invoke-Expression $testCmd

Write-Host ""
Write-Host "2️⃣ If that worked, the issue is Docker daemon DNS isn't being applied" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 Solution: Update docker.service.js to ALWAYS include --dns flags" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your containers need these flags:" -ForegroundColor White
Write-Host "  --dns=8.8.8.8" -ForegroundColor Green
Write-Host "  --dns=8.8.4.4" -ForegroundColor Green
Write-Host "  --dns=1.1.1.1" -ForegroundColor Green
Write-Host ""
Write-Host "These are already in your docker.service.js code!" -ForegroundColor Green
Write-Host "But Docker might be ignoring the HostConfig.Dns setting." -ForegroundColor Yellow
