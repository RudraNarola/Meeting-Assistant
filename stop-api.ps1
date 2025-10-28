# Stop Summary API Service

Write-Host "🛑 Stopping Summary API Service..." -ForegroundColor Yellow
Write-Host ""

docker-compose -f docker-compose.api.yml down

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Services stopped successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 To remove all data (MongoDB volumes):" -ForegroundColor Cyan
    Write-Host "   docker-compose -f docker-compose.api.yml down -v" -ForegroundColor White
    Write-Host ""
    Write-Host "🔄 To restart:" -ForegroundColor Cyan
    Write-Host "   .\start-api.ps1" -ForegroundColor White
} else {
    Write-Host "❌ Failed to stop services" -ForegroundColor Red
}
