# Build Docker Image for Algo Runner
# This script builds the Docker image needed to run trading strategies

Write-Host "🐳 Building Algo Runner Docker Image..." -ForegroundColor Cyan
Write-Host ""

# Navigate to the algo-runner directory
Set-Location "$PSScriptRoot\algo-runner"

# Check if Dockerfile exists
if (-not (Test-Path "Dockerfile")) {
    Write-Host "❌ Error: Dockerfile not found in algo-runner directory" -ForegroundColor Red
    exit 1
}

# Check if required files exist
$requiredFiles = @("Tradehull_V2.py", "requirements.txt")
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "❌ Error: Required file '$file' not found" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ All required files found" -ForegroundColor Green
Write-Host ""

# Build the Docker image
Write-Host "🔨 Building Docker image 'algo-runner-image:latest'..." -ForegroundColor Yellow
docker build -t algo-runner-image:latest .

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Docker image built successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Verify the image exists
    Write-Host "📋 Verifying image..." -ForegroundColor Cyan
    docker images algo-runner-image:latest
    
    Write-Host ""
    Write-Host "🎉 Setup complete! You can now start your trading strategies." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Error: Docker build failed" -ForegroundColor Red
    Write-Host "Please check the error messages above" -ForegroundColor Yellow
    exit 1
}

# Return to original directory
Set-Location $PSScriptRoot
