# Quick SSH connection to EC2 instance

$EC2_IP = "13.233.57.134"
$EC2_USER = "ubuntu"
$KEY_FILE = "$PSScriptRoot\ec2-key.pem"

Write-Host "🔐 Connecting to EC2 instance..." -ForegroundColor Cyan
Write-Host "Server: ${EC2_USER}@${EC2_IP}" -ForegroundColor Yellow
Write-Host ""

# Fix key permissions
icacls $KEY_FILE /inheritance:r | Out-Null
icacls $KEY_FILE /grant:r "$($env:USERNAME):(R)" | Out-Null

# Connect via SSH
ssh -i $KEY_FILE -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_IP}
