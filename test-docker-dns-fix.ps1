# Test DNS resolution in Docker container

Write-Host "🔍 Testing DNS Resolution in Docker..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Check Docker daemon DNS settings
Write-Host "1️⃣ Checking Docker Desktop DNS settings..." -ForegroundColor Yellow
docker info | Select-String -Pattern "DNS"

Write-Host ""
Write-Host "2️⃣ Testing DNS resolution in a test container..." -ForegroundColor Yellow

# Run a simple test container with DNS configured
$testResult = docker run --rm --dns 8.8.8.8 --dns 8.8.4.4 python:3.9-slim python -c @"
import socket
try:
    result = socket.gethostbyname('images.dhan.co')
    print(f'✅ DNS Resolution SUCCESS: images.dhan.co -> {result}')
except Exception as e:
    print(f'❌ DNS Resolution FAILED: {e}')
"@

Write-Host $testResult

Write-Host ""
Write-Host "3️⃣ Testing with algo-runner-image..." -ForegroundColor Yellow

$algoTest = docker run --rm --dns 8.8.8.8 --dns 8.8.4.4 algo-runner-image python -c @"
import socket
try:
    result = socket.gethostbyname('images.dhan.co')
    print(f'✅ DNS Resolution SUCCESS: images.dhan.co -> {result}')
except Exception as e:
    print(f'❌ DNS Resolution FAILED: {e}')
"@

Write-Host $algoTest

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

if ($testResult -like "*SUCCESS*" -and $algoTest -like "*SUCCESS*") {
    Write-Host "✅ DNS is working! The issue might be elsewhere." -ForegroundColor Green
} else {
    Write-Host "❌ DNS resolution is failing in Docker containers" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Solutions to try:" -ForegroundColor Yellow
    Write-Host "1. Open Docker Desktop → Settings → Resources → Network" -ForegroundColor White
    Write-Host "2. Disable 'Use kernel networking for UDP'" -ForegroundColor White
    Write-Host "3. Or try adding DNS manually in daemon.json" -ForegroundColor White
    Write-Host ""
    Write-Host "Location: C:\ProgramData\Docker\config\daemon.json" -ForegroundColor Cyan
    Write-Host 'Add: { "dns": ["8.8.8.8", "8.8.4.4"] }' -ForegroundColor White
}
