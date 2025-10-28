# Quick Start Script for Kafka Summary Pipeline

Write-Host "🚀 Starting Kafka Summary Pipeline..." -ForegroundColor Green
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

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found. Please create it with your GROQ_API_KEY" -ForegroundColor Red
    exit 1
}
Write-Host "✅ .env file found" -ForegroundColor Green
Write-Host ""

# Start the services
Write-Host "Starting all services..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ All services started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 To view logs:" -ForegroundColor Cyan
    Write-Host "   docker-compose logs -f consumer" -ForegroundColor White
    Write-Host ""
    Write-Host "🛑 To stop the pipeline:" -ForegroundColor Cyan
    Write-Host "   docker-compose down" -ForegroundColor White
    Write-Host ""
    Write-Host "Waiting 10 seconds before showing consumer logs..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    Write-Host ""
    Write-Host "📝 Consumer Logs (Press Ctrl+C to exit):" -ForegroundColor Cyan
    docker-compose logs -f consumer
} else {
    Write-Host "❌ Failed to start services" -ForegroundColor Red
    exit 1
}
