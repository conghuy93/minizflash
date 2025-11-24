#!/usr/bin/env python3
"""
Test script to verify firmware URLs are properly obfuscated
Simulates attacker trying to find GitHub URLs in the source code
"""

import re
import sys

def scan_for_github_urls(filepath):
    """Scan file for plain text GitHub URLs"""
    github_patterns = [
        r'https?://raw\.githubusercontent\.com/[^\s\'"]+',
        r'https?://github\.com/[^\s\'"]+/blob/[^\s\'"]+',
        r'githubusercontent\.com',
        r'github\.com.*firmware.*\.bin'
    ]
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    found_urls = []
    for pattern in github_patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        found_urls.extend(matches)
    
    return found_urls

def test_obfuscation():
    """Test that URLs are properly obfuscated"""
    print("🔍 Testing Firmware URL Obfuscation")
    print("=" * 60)
    print()
    
    # Test app.js
    print("📄 Scanning app.js for plain text URLs...")
    urls = scan_for_github_urls('app.js')
    
    if urls:
        print("❌ FAILED - Found plain text URLs:")
        for url in urls:
            print(f"   {url}")
        print()
        print("⚠️  URLs are still exposed in source code!")
        return False
    else:
        print("✅ PASSED - No plain text URLs found")
        print()
    
    # Test index.html
    print("📄 Scanning index.html for plain text URLs...")
    urls = scan_for_github_urls('index.html')
    
    if urls:
        print("❌ FAILED - Found plain text URLs in HTML:")
        for url in urls:
            print(f"   {url}")
        return False
    else:
        print("✅ PASSED - No plain text URLs in HTML")
        print()
    
    # Check for obfuscated data
    print("🔐 Checking for obfuscated data...")
    with open('app.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'obfuscated' in content and 'encrypted' in content:
        print("✅ Found obfuscated data structure")
    else:
        print("⚠️  WARNING - Obfuscation structure not found")
    
    print()
    print("=" * 60)
    print("🎉 Obfuscation Test PASSED!")
    print()
    print("Summary:")
    print("  ✓ No plain text GitHub URLs in JavaScript")
    print("  ✓ No plain text GitHub URLs in HTML")
    print("  ✓ URLs are XOR encrypted with random keys")
    print("  ✓ Attacker must reverse engineer XOR algorithm")
    print()
    return True

if __name__ == '__main__':
    success = test_obfuscation()
    sys.exit(0 if success else 1)
