# EC2 Deployment Script for Algo Runner
# This script deploys your application to AWS EC2

$ErrorActionPreference = "Stop"

# Configuration
$EC2_IP = "13.201.224.180"
$EC2_USER = "ubuntu"  # Change if using a different AMI (Amazon Linux uses 'ec2-user')
$KEY_FILE = "$PSScriptRoot\ec2-key.pem"
$APP_DIR = "/home/ubuntu/algo-runner"  # Adjust if your app is in a different directory

Write-Host "🚀 Deploying Algo Runner to EC2..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

# Check if key file exists
if (-not (Test-Path $KEY_FILE)) {
    Write-Host "❌ Error: SSH key file not found at $KEY_FILE" -ForegroundColor Red
    Write-Host "Please ensure ec2-key.pem is in the project root directory" -ForegroundColor Yellow
    exit 1
}

# Fix key permissions (Windows equivalent)
Write-Host "🔐 Setting key file permissions..." -ForegroundColor Yellow
icacls $KEY_FILE /inheritance:r
icacls $KEY_FILE /grant:r "$($env:USERNAME):(R)"

Write-Host "✅ Key permissions set" -ForegroundColor Green
Write-Host ""

# Test SSH connection
Write-Host "🔍 Testing SSH connection..." -ForegroundColor Yellow
$sshTest = ssh -i $KEY_FILE -o ConnectTimeout=10 -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_IP} "echo 'Connection successful'" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Cannot connect to EC2 instance" -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  - EC2 instance is running" -ForegroundColor Yellow
    Write-Host "  - Security group allows SSH (port 22) from your IP" -ForegroundColor Yellow
    Write-Host "  - The correct key file is being used" -ForegroundColor Yellow
    Write-Host "  - Username is correct (ubuntu for Ubuntu, ec2-user for Amazon Linux)" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ SSH connection successful" -ForegroundColor Green
Write-Host ""

# Deploy application
Write-Host "📦 Deploying application..." -ForegroundColor Cyan
Write-Host ""

# Create deployment script to run on EC2
$deployScript = @"
#!/bin/bash
set -e

echo "📂 Navigating to app directory..."
cd $APP_DIR || { echo "❌ App directory not found. Please clone the repo first!"; exit 1; }

echo "🔄 Pulling latest changes from GitHub..."
git pull origin main

echo "🐳 Building Docker image..."
cd algo-runner
docker build -t algo-runner-image:latest .
cd ..

echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

echo "♻️  Restarting server..."
if command -v pm2 &> /dev/null; then
    pm2 restart all || pm2 start src/server.js --name algo-runner
elif [ -f docker-compose.yml ]; then
    docker-compose restart
else
    echo "⚠️  Please manually restart your server"
fi

echo "✅ Deployment complete!"
"@

# Save deployment script to temp file with Unix line endings
$tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
$deployScript | Out-File -FilePath $tempScript -Encoding UTF8 -NoNewline
# Convert to Unix line endings
(Get-Content $tempScript -Raw) -replace "`r`n", "`n" | Set-Content $tempScript -NoNewline

# Copy and execute deployment script on EC2
Write-Host "📤 Uploading deployment script..." -ForegroundColor Yellow
scp -i $KEY_FILE -o StrictHostKeyChecking=no $tempScript ${EC2_USER}@${EC2_IP}:/tmp/deploy.sh

Write-Host "🔧 Executing deployment on EC2..." -ForegroundColor Yellow
ssh -i $KEY_FILE -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_IP} "chmod +x /tmp/deploy.sh && /tmp/deploy.sh"

# Cleanup
Remove-Item $tempScript -Force

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Your application should now be running at:" -ForegroundColor Cyan
Write-Host "   http://$EC2_IP:3000" -ForegroundColor White
Write-Host ""
Write-Host "📝 To check server logs:" -ForegroundColor Yellow
Write-Host "   ssh -i $KEY_FILE ${EC2_USER}@${EC2_IP}" -ForegroundColor White
Write-Host "   pm2 logs" -ForegroundColor White
Write-Host ""
