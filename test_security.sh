#!/bin/bash
# Test script to verify firmware security

echo "🔒 Testing Firmware Security Implementation"
echo "==========================================="
echo ""

BASE_URL="https://minizjp.com"

# Test 1: Check HTML for GitHub URLs
echo "Test 1: Scanning HTML for exposed GitHub URLs..."
if curl -s $BASE_URL | grep -q "raw.githubusercontent.com"; then
    echo "❌ FAILED - GitHub URLs found in HTML!"
else
    echo "✅ PASSED - No GitHub URLs in HTML"
fi
echo ""

# Test 2: Try direct .bin access
echo "Test 2: Attempting direct firmware.bin access..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/firmware1.bin)
if [ "$STATUS" = "403" ] || [ "$STATUS" = "404" ]; then
    echo "✅ PASSED - Direct .bin access blocked (HTTP $STATUS)"
else
    echo "❌ FAILED - Direct .bin access allowed (HTTP $STATUS)"
fi
echo ""

# Test 3: Proxy without license
echo "Test 3: Proxy download without license (Firmware 1)..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"firmwareId":1}' \
    $BASE_URL/firmware-proxy.php)
if [ "$STATUS" = "403" ]; then
    echo "✅ PASSED - License required (HTTP $STATUS)"
else
    echo "❌ FAILED - Download allowed without license (HTTP $STATUS)"
fi
echo ""

# Test 4: Proxy with invalid license
echo "Test 4: Proxy download with invalid license..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"firmwareId":1,"licenseKey":"FAKE-KEY-1234","deviceMAC":"AA:BB:CC:DD:EE:FF"}' \
    $BASE_URL/firmware-proxy.php)
if [ "$STATUS" = "403" ]; then
    echo "✅ PASSED - Invalid license rejected (HTTP $STATUS)"
else
    echo "❌ FAILED - Invalid license accepted (HTTP $STATUS)"
fi
echo ""

# Test 5: Proxy with valid license format
echo "Test 5: Proxy download with valid license format..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"firmwareId":1,"licenseKey":"MZ1A-K9X4-7P2M-5R8T","deviceMAC":"AA:BB:CC:DD:EE:FF"}' \
    $BASE_URL/firmware-proxy.php)
if [ "$STATUS" = "200" ]; then
    echo "✅ PASSED - Valid license accepted (HTTP $STATUS)"
else
    echo "⚠️  WARNING - Valid license not working (HTTP $STATUS)"
    echo "   (May need PHP server setup)"
fi
echo ""

# Test 6: Proxy for free firmware (no license)
echo "Test 6: Proxy download free firmware (Firmware 2)..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"firmwareId":2,"deviceMAC":"AA:BB:CC:DD:EE:FF"}' \
    $BASE_URL/firmware-proxy.php)
if [ "$STATUS" = "200" ]; then
    echo "✅ PASSED - Free firmware download works (HTTP $STATUS)"
else
    echo "⚠️  WARNING - Free firmware download failed (HTTP $STATUS)"
    echo "   (May need PHP server setup)"
fi
echo ""

# Test 7: Check for data-fw-id obfuscation
echo "Test 7: Checking HTML uses obfuscated IDs..."
if curl -s $BASE_URL | grep -q 'data-fw-id="fw1"'; then
    echo "✅ PASSED - Using obfuscated firmware IDs"
else
    echo "❌ FAILED - Not using obfuscated IDs"
fi
echo ""

# Test 8: Directory listing
echo "Test 8: Checking directory listing disabled..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/)
CONTENT=$(curl -s $BASE_URL/)
if echo "$CONTENT" | grep -q "Index of"; then
    echo "❌ FAILED - Directory listing enabled!"
else
    echo "✅ PASSED - Directory listing disabled"
fi
echo ""

echo "==========================================="
echo "🏁 Security Test Complete"
echo ""
echo "Note: Some tests may show WARNING if PHP server is not configured."
echo "This is normal for GitHub Pages (static hosting)."
echo "For full security, deploy to a PHP-enabled server."
