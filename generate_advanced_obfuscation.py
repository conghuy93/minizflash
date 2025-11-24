#!/usr/bin/env python3
"""
Advanced URL Obfuscation - Layer 2
Combines XOR encryption with code obfuscation and anti-reverse-engineering
"""

import base64
import random
import string

def generate_obfuscated_code():
    """Generate heavily obfuscated JavaScript code"""
    
    # Original URLs
    urls = {
        'fw1': 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware1.bin',
        'fw2': 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware2.bin',
        'fw3': 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware3.bin',
        'fw4': 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware4.bin',
        'fw5': 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware5.bin'
    }
    
    # Generate multi-layer encryption
    obfuscated = {}
    for fw_id, url in urls.items():
        # Layer 1: XOR with key part 1
        key1 = ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(8))
        xor1 = ''.join(chr(ord(c) ^ ord(key1[i % len(key1)])) for i, c in enumerate(url))
        
        # Layer 2: Base64
        b64 = base64.b64encode(xor1.encode('latin-1')).decode('ascii')
        
        # Layer 3: XOR with key part 2 (apply to base64 string)
        key2 = ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(8))
        xor2 = ''.join(chr(ord(c) ^ ord(key2[i % len(key2)])) for i, c in enumerate(b64))
        
        # Layer 4: Final base64
        final = base64.b64encode(xor2.encode('latin-1')).decode('ascii')
        
        # Split keys into parts
        k1a, k1b = key1[:4], key1[4:]
        k2a, k2b = key2[:4], key2[4:]
        
        obfuscated[fw_id] = {
            'data': final,
            'k1a': k1a, 'k1b': k1b,
            'k2a': k2a, 'k2b': k2b
        }
    
    # Generate fake entries to confuse
    for i in range(10):
        fake_id = f'_fake_{i}'
        obfuscated[fake_id] = {
            'data': base64.b64encode(''.join(random.choices(string.ascii_letters, k=80)).encode()).decode(),
            'k1a': ''.join(random.choices(string.ascii_lowercase, k=4)),
            'k1b': ''.join(random.choices(string.ascii_lowercase, k=4)),
            'k2a': ''.join(random.choices(string.ascii_lowercase, k=4)),
            'k2b': ''.join(random.choices(string.ascii_lowercase, k=4))
        }
    
    print("// Multi-layer obfuscated firmware URLs")
    print("// WARNING: Reverse engineering this will take hours")
    print("const _0x = {")
    for fw_id, data in obfuscated.items():
        print(f"  '{fw_id}': {{d:'{data['data']}',a:'{data['k1a']}',b:'{data['k1b']}',c:'{data['k2a']}',e:'{data['k2b']}'}},")
    print("};")
    
    print()
    print("// Obfuscated decoder (minified)")
    print("""
const _d=(x,k)=>{try{const d=atob(x);return d.split('').map((c,i)=>String.fromCharCode(c.charCodeAt(0)^k.charCodeAt(i%k.length))).join('')}catch(e){return null}};
const _g=(id)=>{const o=_0x[id];if(!o||id.startsWith('_fake_'))return null;const k1=o.a+o.b,k2=o.c+o.e;const d1=_d(o.d,k2);if(!d1)return null;const d2=_d(d1,k1);return d2};
    """.strip())
    
    print()
    print("// Test:")
    for fw_id in ['fw1', 'fw2', 'fw3', 'fw4', 'fw5']:
        print(f"// console.log(_g('{fw_id}'));")

if __name__ == '__main__':
    generate_obfuscated_code()
