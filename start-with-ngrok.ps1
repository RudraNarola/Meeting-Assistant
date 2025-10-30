# Meeting Assistant - Development Setup with ngrok
# This script starts the Next.js dev server and ngrok tunnel

Write-Host "🚀 Starting Meeting Assistant with ngrok..." -ForegroundColor Green
Write-Host ""

# Check if ngrok is installed
if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
    Write-Host "❌ ngrok is not installed. Installing..." -ForegroundColor Red
    npm install -g ngrok
}

# Start Next.js dev server in background
Write-Host "📱 Starting Next.js dev server on port 3000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

# Wait for dev server to start
Write-Host "⏳ Waiting for dev server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start ngrok tunnel
Write-Host "🌐 Starting ngrok tunnel..." -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Your public URL will appear below:" -ForegroundColor Green
Write-Host "   Share this URL with others to join meetings" -ForegroundColor Green
Write-Host ""

ngrok http 3000 --log=stdout
