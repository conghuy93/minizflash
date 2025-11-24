#!/usr/bin/env python3
"""
Generate obfuscated firmware URLs for app.js
This prevents URLs from appearing in plain text in the source code
"""

import base64
import random
import string

def xor_encrypt(text, key):
    """XOR encrypt text with key"""
    encrypted = []
    for i, char in enumerate(text):
        key_char = key[i % len(key)]
        encrypted_char = chr(ord(char) ^ ord(key_char))
        encrypted.append(encrypted_char)
    return ''.join(encrypted)

def generate_random_key(length=12):
    """Generate random alphanumeric key"""
    return ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(length))

def obfuscate_url(url):
    """Obfuscate URL with XOR encryption and base64 encoding"""
    key = generate_random_key()
    encrypted = xor_encrypt(url, key)
    encoded = base64.b64encode(encrypted.encode('latin-1')).decode('ascii')
    return encoded, key

# Firmware URLs to obfuscate
urls = {
    'fw1': 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware1.bin',
    'fw2': 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware2.bin',
    'fw3': 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware3.bin',
    'fw4': 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware4.bin',
    'fw5': 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware5.bin'
}

print("// Pre-encrypted firmware URLs - NO PLAIN TEXT")
print("const obfuscated = {")

for fw_id, url in urls.items():
    encrypted, key = obfuscate_url(url)
    print(f"    '{fw_id}': ['{encrypted}', '{key}'],")

print("};")

print("\n// Test decryption:")
for fw_id, url in urls.items():
    encrypted, key = obfuscate_url(url)
    # Test decrypt
    decoded = base64.b64decode(encrypted).decode('latin-1')
    decrypted = xor_encrypt(decoded, key)
    if decrypted == url:
        print(f"✓ {fw_id}: OK")
    else:
        print(f"✗ {fw_id}: FAILED")
        print(f"  Expected: {url}")
        print(f"  Got: {decrypted}")
