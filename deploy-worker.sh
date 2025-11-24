#!/bin/bash
# Quick Deploy to Cloudflare Workers

echo "🚀 Deploying minizflash-proxy to Cloudflare Workers..."
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "📦 Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Login (nếu chưa login)
echo "🔐 Checking Cloudflare authentication..."
wrangler whoami || wrangler login

# Deploy
echo ""
echo "🚀 Deploying worker..."
wrangler deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Your worker URL:"
echo "https://minizflash-proxy.YOUR-SUBDOMAIN.workers.dev"
echo ""
echo "Next steps:"
echo "1. Copy the worker URL"
echo "2. Update app.js with: const PROXY_URL = 'YOUR_WORKER_URL'"
echo "3. Test: curl -X POST YOUR_WORKER_URL -d '{\"firmwareId\":2,\"deviceMAC\":\"AA:BB:CC:DD:EE:FF\"}'"
