# Summary API Service - Quick Start

Write-Host "🚀 Starting Summary API Service..." -ForegroundColor Green
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker..." -ForegroundColor Yellow
$dockerRunning = docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker is running" -ForegroundColor Green
Write-Host ""

# Start the services
Write-Host "Starting MongoDB and API service..." -ForegroundColor Yellow
docker-compose -f docker-compose.api.yml up -d --build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Services started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Available Endpoints:" -ForegroundColor Cyan
    Write-Host "   GET    http://localhost:8000/summaries       - Get all summaries" -ForegroundColor White
    Write-Host "   GET    http://localhost:8000/summaries/{id}  - Get specific summary" -ForegroundColor White
    Write-Host "   DELETE http://localhost:8000/summaries/{id}  - Delete summary" -ForegroundColor White
    Write-Host ""
    Write-Host "📖 Interactive API Docs:" -ForegroundColor Cyan
    Write-Host "   http://localhost:8000/docs" -ForegroundColor White
    Write-Host ""
    Write-Host "🔍 Check service status:" -ForegroundColor Cyan
    Write-Host "   docker-compose -f docker-compose.api.yml ps" -ForegroundColor White
    Write-Host ""
    Write-Host "🛑 To stop:" -ForegroundColor Cyan
    Write-Host "   docker-compose -f docker-compose.api.yml down" -ForegroundColor White
    Write-Host ""
    
    # Wait for services to be ready
    Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # Check API health
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/" -Method Get -TimeoutSec 5
        Write-Host "✅ API is responding!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 Service is ready for use!" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ API is starting, please wait a few seconds..." -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Failed to start services" -ForegroundColor Red
    exit 1
}
