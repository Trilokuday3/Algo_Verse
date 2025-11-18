# First-time EC2 Setup Script
# Run this if you haven't cloned the repository on EC2 yet

$EC2_IP = "13.201.224.180"
$EC2_USER = "ubuntu"
$KEY_FILE = "$PSScriptRoot\ec2-key.pem"
$REPO_URL = "https://github.com/Trilokuday3/Algo_Verse.git"
$APP_DIR = "/home/ubuntu/algo-runner"

Write-Host "🔧 First-time EC2 Setup" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

# Fix key permissions
icacls $KEY_FILE /inheritance:r | Out-Null
icacls $KEY_FILE /grant:r "$($env:USERNAME):(R)" | Out-Null

$setupScript = @"
#!/bin/bash
set -e

echo "🔍 Checking prerequisites..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y docker.io
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker ubuntu
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "📦 Installing Git..."
    sudo apt-get install -y git
fi

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

echo "✅ Prerequisites installed"

# Clone repository if not exists
if [ ! -d "$APP_DIR" ]; then
    echo "📥 Cloning repository..."
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
else
    echo "📁 Repository already exists, pulling latest..."
    cd $APP_DIR
    git pull origin main
fi

# Create .env file if not exists
if [ ! -f "server/.env" ]; then
    echo "📝 Creating .env file..."
    cat > server/.env << 'EOL'
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
MONGODB_URI=mongodb://localhost:27017/algo-runner
PORT=3000
NODE_ENV=production
EOL
    echo "⚠️  Please update server/.env with your actual values!"
fi

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Build Docker image
echo "🐳 Building Docker image..."
cd algo-runner
docker build -t algo-runner-image:latest .
cd ..

# Start server with PM2
echo "🚀 Starting server..."
cd server
pm2 start src/server.js --name algo-runner
pm2 save
pm2 startup

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update server/.env with your MongoDB URI and JWT secret"
echo "2. Configure firewall to allow ports 3000 and 5500"
echo "3. Restart the server: pm2 restart algo-runner"
echo ""
"@

$tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
$setupScript | Out-File -FilePath $tempScript -Encoding UTF8 -NoNewline
# Convert to Unix line endings
(Get-Content $tempScript -Raw) -replace "`r`n", "`n" | Set-Content $tempScript -NoNewline

Write-Host "📤 Uploading setup script..." -ForegroundColor Yellow
scp -i $KEY_FILE -o StrictHostKeyChecking=no $tempScript ${EC2_USER}@${EC2_IP}:/tmp/setup.sh

Write-Host "🔧 Running setup on EC2..." -ForegroundColor Yellow
ssh -i $KEY_FILE -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_IP} "chmod +x /tmp/setup.sh && /tmp/setup.sh"

Remove-Item $tempScript -Force

Write-Host ""
Write-Host "✅ Setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now use deploy-to-ec2.ps1 for future deployments" -ForegroundColor Cyan
