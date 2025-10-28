# Stop Kafka Summary Pipeline

Write-Host "🛑 Stopping Kafka Summary Pipeline..." -ForegroundColor Yellow
Write-Host ""

docker-compose down

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ All services stopped successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To remove volumes as well, run:" -ForegroundColor Cyan
    Write-Host "   docker-compose down -v" -ForegroundColor White
} else {
    Write-Host "❌ Failed to stop services" -ForegroundColor Red
}
