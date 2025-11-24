# 🔒 Firmware Security Architecture - Visual Guide

## 📊 Before Security (VULNERABLE)

```
┌─────────────┐
│   Browser   │
│  (Attacker) │
└──────┬──────┘
       │ 1. View HTML source
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  <div data-url="https://raw.githubusercontent.com/  │
│        conghuy93/minizflash/main/firmware1.bin">    │
└──────────────────────────────────────────────────────┘
       │
       │ 2. Copy URL
       │
       ▼
┌─────────────┐
│   GitHub    │ ◄─── 3. Direct download (NO LICENSE CHECK!)
│  Raw Files  │
└─────────────┘
       │
       │ 4. GET firmware1.bin
       ▼
┌─────────────┐
│  firmware   │ ✗ Downloaded without license!
│   .bin      │ ✗ Security bypassed!
└─────────────┘
```

**❌ Problems:**
- GitHub URL visible in HTML
- Anyone can download directly from GitHub
- License system completely bypassed
- No audit trail
- No rate limiting

---

## 🛡️ After Security (3-LAYER PROTECTION)

### Layer 1: HTML Obfuscation

```
┌─────────────┐
│   Browser   │
│  (Attacker) │
└──────┬──────┘
       │ 1. View HTML source
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  <div data-fw-id="fw1">                              │
│  <!-- No GitHub URL visible! -->                     │
└──────────────────────────────────────────────────────┘
       │
       │ 2. Try to find URL...
       │
       ▼
┌─────────────────────────────────────────────────────┐
│  // JavaScript (minified)                           │
│  firmwareMap = {                                    │
│    fw1: {                                           │
│      encrypted: "QmxhY2sgQm94IE5vIFVSTCE=...",     │
│      key: "xf8k2p9q..."                            │
│    }                                                │
│  }                                                  │
└─────────────────────────────────────────────────────┘
       │
       │ 3. Reverse engineer XOR...
       │
       ▼
❓ Hard but possible with effort
```

**✓ Benefits:**
- GitHub URL not in plain text
- Requires reverse engineering JS
- Delays casual attackers

**⚠️ Limitations:**
- Can be broken by skilled attacker
- Client-side security always bypassable

---

### Layer 2: Server-Side Proxy (MAIN DEFENSE)

```
┌─────────────┐
│   Browser   │
│ (Legitimate │
│    User)    │
└──────┬──────┘
       │
       │ POST /firmware-proxy.php
       │ {
       │   firmwareId: 1,
       │   licenseKey: "MZ1A-...",
       │   deviceMAC: "AA:BB:..."
       │ }
       │
       ▼
┌─────────────────────────────────────────────────────┐
│               firmware-proxy.php                    │
│                 (PHP Server)                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1️⃣  Verify License                                │
│     ├─ Check format: /^MZ[0-9][A-Z]-...$/          │
│     ├─ Firmware 1? → License required              │
│     └─ Invalid? → 403 Forbidden                    │
│                                                     │
│  2️⃣  Server-Side URL Mapping (Hidden from client) │
│     $urls = [                                      │
│       1 => "https://raw.github...firmware1.bin",   │
│       2 => "https://raw.github...firmware2.bin",   │
│     ];                                             │
│     Client NEVER sees these URLs!                  │
│                                                     │
│  3️⃣  Download from GitHub                         │
│     curl_exec($ch); // Server downloads            │
│                                                     │
│  4️⃣  Log Activity                                 │
│     2025-11-24 10:15:30 - FW1 - MAC: AA:BB:...    │
│                                                     │
│  5️⃣  Return Binary                                │
│     Return firmware.bin to client                  │
│                                                     │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
            ┌─────────────┐
            │   GitHub    │
            │  Raw Files  │
            └─────────────┘
                   │
                   ▼
            ┌─────────────┐
            │  firmware   │ ✓ Only accessed by server
            │   .bin      │ ✓ After license check
            └─────────────┘
```

**✅ Benefits:**
- Client NEVER knows GitHub URL
- Server enforces license check
- Cannot be bypassed (server-side)
- Full audit trail
- Can add rate limiting
- Can add IP blocking
- Can integrate with database

**Attack Scenarios Blocked:**

```
Scenario 1: Attacker tries direct download
┌─────────────┐
│  Attacker   │ ──► curl firmware1.bin
└─────────────┘      ↓
                     ✗ 403 Forbidden (.htaccess)

Scenario 2: Attacker tries proxy without license
┌─────────────┐
│  Attacker   │ ──► POST /proxy {firmwareId: 1}
└─────────────┘      ↓
                     ✗ 403 License required (PHP)

Scenario 3: Attacker tries fake license
┌─────────────┐
│  Attacker   │ ──► POST /proxy {firmwareId: 1, key: "FAKE"}
└─────────────┘      ↓
                     ✗ 403 Invalid license format (PHP)

Scenario 4: Attacker tries reverse proxy URL
┌─────────────┐
│  Attacker   │ ──► Inspect network traffic...
└─────────────┘      ↓
                     Response: Binary data only
                     GitHub URL never sent to client ✓
```

---

### Layer 3: Apache .htaccess (LAST LINE OF DEFENSE)

```
┌─────────────┐
│  Attacker   │
└──────┬──────┘
       │
       │ curl https://minizjp.com/firmware1.bin
       │
       ▼
┌───────────────────────────────────────────────┐
│            Apache Web Server                  │
│           (.htaccess rules)                   │
├───────────────────────────────────────────────┤
│                                               │
│  <FilesMatch "\.(bin|sha256)$">              │
│      Order Allow,Deny                        │
│      Deny from all                           │
│  </FilesMatch>                               │
│                                               │
│  Options -Indexes  ← No directory browsing   │
│                                               │
└────────────────┬──────────────────────────────┘
                 │
                 ▼
           ✗ 403 Forbidden
           Access Denied
```

**✅ Benefits:**
- Blocks direct file access at Apache level
- Prevents directory listing
- Works even if PHP fails
- Fast (handled by Apache, not PHP)

---

## 🔄 Complete Flow - Legitimate User

```
                    LEGITIMATE USER FLOW
                    
┌──────────────────────────────────────────────────────┐
│ 1. User selects Firmware 1                          │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│ 2. JavaScript checks: License validated?            │
│    ├─ No  → Show license input prompt               │
│    └─ Yes → Continue to step 3                      │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│ 3. User enters license: MZ1A-K9X4-7P2M-5R8T         │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│ 4. Read device MAC address from ESP32 EFUSE         │
│    └─ 0x60007044, 0x60007048                        │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│ 5. Validate license locally (format + binding)      │
│    ├─ Format OK?                                    │
│    ├─ Not used? → Bind to this MAC                  │
│    ├─ Used? → MAC match?                            │
│    └─ Store in localStorage                         │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│ 6. User clicks "Flash" button                       │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│ 7. JavaScript decrypts fw1 → Gets obfuscated URL    │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│ 8. POST to /firmware-proxy.php                      │
│    {                                                 │
│      firmwareId: 1,                                  │
│      licenseKey: "MZ1A-K9X4-7P2M-5R8T",             │
│      deviceMAC: "AA:BB:CC:DD:EE:FF"                 │
│    }                                                 │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│ 9. Server validates license                         │
│    ✓ Format correct                                 │
│    ✓ Firmware 1 → License present                   │
│    ✓ Pattern matches                                │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│ 10. Server downloads from GitHub                    │
│     curl https://raw.githubusercontent.com/...      │
│     (Client never sees this URL)                    │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│ 11. Server logs download                            │
│     2025-11-24 10:15:30 - FW1 - MAC: AA:BB:...      │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│ 12. Server returns binary to client                 │
│     Content-Type: application/octet-stream          │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│ 13. esptool-js flashes firmware to ESP32            │
│     ✓ Flash successful                              │
└──────────────────────────────────────────────────────┘
```

---

## 📊 Security Comparison Table

| Feature | Before | After (Layer 1) | After (Layer 2) | After (Layer 3) |
|---------|--------|-----------------|-----------------|-----------------|
| **GitHub URL in HTML** | ✗ Visible | ✓ Hidden | ✓ Hidden | ✓ Hidden |
| **URL in JavaScript** | ✗ Plain text | ⚠️ Encrypted | ✓ Server-only | ✓ Server-only |
| **Direct .bin access** | ✗ Allowed | ✗ Allowed | ✗ Allowed | ✓ Blocked |
| **License verification** | ⚠️ Client-only | ⚠️ Client-only | ✓ Server-side | ✓ Server-side |
| **Audit trail** | ✗ None | ✗ None | ✓ Full log | ✓ Full log |
| **Bypassable?** | ✓ Trivial | ⚠️ With effort | ✗ No | ✗ No |
| **Rate limiting** | ✗ None | ✗ None | ✓ Possible | ✓ Possible |
| **IP blocking** | ✗ None | ✗ None | ✓ Possible | ✓ Possible |

---

## 🎯 Security Level Assessment

### 🔓 Level 0: No Security (Original)
```
Attacker skill required: None
Time to bypass: 10 seconds
Tools needed: Web browser
```

### 🔒 Level 1: HTML Obfuscation
```
Attacker skill required: Basic JavaScript
Time to bypass: 5-10 minutes
Tools needed: Browser DevTools
```

### 🔒🔒 Level 2: Server Proxy
```
Attacker skill required: Advanced (server hacking)
Time to bypass: Hours to days
Tools needed: Server exploitation
Success rate: Low
```

### 🔒🔒🔒 Level 3: Full Stack (All Layers)
```
Attacker skill required: Expert
Time to bypass: Very difficult
Tools needed: Server exploitation + network analysis
Success rate: Very low
Defense in depth: ✓
```

---

## 📝 Quick Reference

### What Changed?

**HTML:**
```diff
- data-url="https://raw.githubusercontent.com/..."
+ data-fw-id="fw1"
```

**JavaScript:**
```diff
- const url = card.dataset.url;
+ const fwId = card.dataset.fwId;
+ const url = this.decryptURL(this.firmwareMap[fwId].encrypted, key);
+ 
+ // Use proxy
+ fetch('/firmware-proxy.php', {
+   method: 'POST',
+   body: JSON.stringify({firmwareId, licenseKey, deviceMAC})
+ })
```

**Server:**
```php
// NEW: firmware-proxy.php
if ($firmwareId === 1 && !$licenseKey) {
    http_response_code(403);
    exit();
}

$url = $firmwareUrls[$firmwareId]; // Hidden from client
$firmware = curl_exec($ch);
echo $firmware;
```

**Apache:**
```apache
# NEW: .htaccess
<FilesMatch "\.(bin|sha256)$">
    Deny from all
</FilesMatch>
```

---

## 🚀 Deployment Checklist

- [ ] Upload `firmware-proxy.php`
- [ ] Upload `.htaccess`
- [ ] Update `app.js` with proxy logic
- [ ] Update `index.html` with `data-fw-id`
- [ ] Test: Can't see GitHub URLs in HTML
- [ ] Test: Can't download .bin directly
- [ ] Test: Proxy requires license for FW1
- [ ] Test: Proxy works for FW2-5
- [ ] Check logs: `firmware_download.log`
- [ ] Monitor for abuse patterns

---

## 📚 Documentation

- `FIRMWARE_SECURITY.md` - Full documentation
- `SECURITY_README.md` - Quick start
- `test_security.sh` - Automated tests
- This file - Visual architecture guide
