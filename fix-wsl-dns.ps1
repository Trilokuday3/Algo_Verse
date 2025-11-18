# Fix Docker DNS on Windows using WSL2
# Run this as Administrator

Write-Host "🔧 Fixing Docker DNS for WSL2..." -ForegroundColor Cyan

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ This script requires Administrator privileges!" -ForegroundColor Red
    exit 1
}

# Create WSL config file
$wslConfigPath = "$env:USERPROFILE\.wslconfig"
$wslConfig = @"
[wsl2]
networkingMode=mirrored
dnsTunneling=true

[network]
generateResolvConf=true
"@

Write-Host "📝 Creating WSL config at: $wslConfigPath" -ForegroundColor Yellow
$wslConfig | Out-File -FilePath $wslConfigPath -Encoding UTF8 -Force

Write-Host "✅ WSL config created" -ForegroundColor Green

# Also create resolv.conf
Write-Host "📝 Setting DNS in WSL..." -ForegroundColor Yellow
wsl -d docker-desktop -u root -- bash -c "echo 'nameserver 8.8.8.8' > /etc/resolv.conf && echo 'nameserver 8.8.4.4' >> /etc/resolv.conf && echo 'nameserver 1.1.1.1' >> /etc/resolv.conf"

Write-Host "✅ DNS configured in WSL" -ForegroundColor Green
Write-Host ""
Write-Host "🔄 You must restart Docker Desktop for changes to take effect!" -ForegroundColor Yellow
Write-Host ""

$restart = Read-Host "Restart Docker Desktop now? (y/n)"
if ($restart -eq 'y') {
    Write-Host "Stopping Docker Desktop..." -ForegroundColor Yellow
    Stop-Process -Name "Docker Desktop" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 5
    
    Write-Host "Starting Docker Desktop..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    
    Write-Host "✅ Docker Desktop is restarting..." -ForegroundColor Green
}
