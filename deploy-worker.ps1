# PowerShell script to deploy Cloudflare Worker
# Run this script from the web/ directory

Write-Host "🚀 Cloudflare Worker Deployment Script" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Check if wrangler is installed
Write-Host "Checking Wrangler installation..." -ForegroundColor Yellow
try {
    $wranglerVersion = wrangler --version 2>&1
    Write-Host "✅ Wrangler is installed: $wranglerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Wrangler is not installed!" -ForegroundColor Red
    Write-Host "Install it with: npm install -g wrangler" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Deploying Worker..." -ForegroundColor Yellow
Write-Host ""

# Deploy the worker
wrangler deploy --name firmware-proxy

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "Worker URL: https://firmware-proxy.minizjp.workers.dev/" -ForegroundColor Cyan
