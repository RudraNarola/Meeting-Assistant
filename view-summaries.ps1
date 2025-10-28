# View Consumer Logs - Shows AI Summaries in Real-time

Write-Host "📝 Viewing Kafka Consumer Logs (summaries will appear here)" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to exit" -ForegroundColor Yellow
Write-Host ""

docker-compose logs -f consumer
