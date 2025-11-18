# Fix Docker Desktop DNS Issues
# This script configures Docker daemon to use Google DNS

$ErrorActionPreference = "Stop"

Write-Host "🔧 Fixing Docker DNS Configuration..." -ForegroundColor Cyan
Write-Host ""

$dockerConfigPath = "C:\ProgramData\Docker\config"
$daemonJsonPath = Join-Path $dockerConfigPath "daemon.json"

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run PowerShell as Administrator and try again:" -ForegroundColor Yellow
    Write-Host "Right-click PowerShell → Run as Administrator" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Create config directory if it doesn't exist
if (-not (Test-Path $dockerConfigPath)) {
    New-Item -ItemType Directory -Path $dockerConfigPath -Force | Out-Null
    Write-Host "✅ Created Docker config directory" -ForegroundColor Green
}

# Backup existing daemon.json if it exists
if (Test-Path $daemonJsonPath) {
    $backupPath = "$daemonJsonPath.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $daemonJsonPath $backupPath
    Write-Host "📋 Backed up existing daemon.json to:" -ForegroundColor Yellow
    Write-Host "   $backupPath" -ForegroundColor White
    Write-Host ""
}

# Create or update daemon.json
$daemonConfig = @{
    "dns" = @("8.8.8.8", "8.8.4.4", "1.1.1.1")
    "dns-opts" = @("ndots:0")
}

$daemonConfig | ConvertTo-Json | Set-Content $daemonJsonPath -Encoding UTF8

Write-Host "✅ Updated daemon.json with DNS configuration:" -ForegroundColor Green
Get-Content $daemonJsonPath | Write-Host -ForegroundColor White
Write-Host ""

Write-Host "⚠️  IMPORTANT: Docker Desktop must be restarted!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Options:" -ForegroundColor Cyan
Write-Host "1. Restart Docker Desktop manually (recommended)" -ForegroundColor White
Write-Host "2. Or run: Restart-Service docker" -ForegroundColor White
Write-Host ""

$response = Read-Host "Do you want to restart Docker Desktop now? (y/n)"

if ($response -eq 'y') {
    Write-Host ""
    Write-Host "🔄 Restarting Docker Desktop..." -ForegroundColor Yellow
    
    # Stop Docker Desktop
    Stop-Process -Name "Docker Desktop" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 5
    
    # Start Docker Desktop
    $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Start-Process $dockerPath
        Write-Host "✅ Docker Desktop is restarting..." -ForegroundColor Green
        Write-Host "Wait for Docker to fully start (check system tray)" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Could not find Docker Desktop executable" -ForegroundColor Red
        Write-Host "Please restart Docker Desktop manually" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "Please restart Docker Desktop manually for changes to take effect" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "✅ DNS configuration complete!" -ForegroundColor Green
Write-Host ""
