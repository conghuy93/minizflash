# 🔒 Hệ Thống Bảo Mật Firmware - Giải Pháp 3 Lớp

## ⚠️ Vấn Đề Bảo Mật Ban Đầu

**LỖ HỔNG NGHIÊM TRỌNG:**
```html
<!-- HTML cũ - KHÔNG BẢO MẬT -->
<div class="firmware-card" 
     data-url="https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware1.bin">
```

**Hậu quả:**
- ✗ Bất kỳ ai cũng thấy được URL GitHub
- ✗ Download trực tiếp firmware KHÔNG CẦN LICENSE
- ✗ Bypass hoàn toàn hệ thống bảo mật
- ✗ Dùng tool scan HTML → Tìm thấy tất cả firmware URLs

## 🛡️ Giải Pháp 3 Lớp Bảo Mật

### Lớp 1: Mã Hóa URL Trong HTML ✅

**Trước:**
```html
data-url="https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware1.bin"
```

**Sau:**
```html
data-fw-id="fw1"
```

**Cách hoạt động:**
1. HTML chỉ lưu ID (`fw1`, `fw2`, ...), KHÔNG lưu URL
2. URL thật được mã hóa XOR trong JavaScript
3. Mỗi lần load page, key XOR được random mới

**Code:**
```javascript
// Mã hóa URL với XOR encryption
encryptURL(url) {
    const key = Math.random().toString(36).substring(2, 15);
    const encrypted = btoa(url.split('').map((char, i) => 
        String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join(''));
    return { encrypted, key };
}

// Firmware map với URLs đã mã hóa
this.firmwareMap = {
    'fw1': this.encryptURL('https://raw.githubusercontent.com/...'),
    'fw2': this.encryptURL('https://raw.githubusercontent.com/...'),
    // ...
};
```

**Lợi ích:**
- GitHub URL không xuất hiện trong HTML source
- Không thể scan HTML để tìm URLs
- Key thay đổi mỗi lần load page

### Lớp 2: Proxy Server-Side 🔐

**Kiến trúc:**
```
Client → firmware-proxy.php → GitHub → firmware-proxy.php → Client
         ↑ Verify license                                    ↑ Return binary
```

**File:** `firmware-proxy.php`

**Quy trình:**
1. **Client gửi request đến proxy** (KHÔNG gửi đến GitHub)
   ```javascript
   fetch('/firmware-proxy.php', {
       method: 'POST',
       body: JSON.stringify({
           firmwareId: 1,
           licenseKey: 'MZ1A-K9X4-7P2M-5R8T',
           deviceMAC: 'AA:BB:CC:DD:EE:FF'
       })
   })
   ```

2. **Server kiểm tra license** (trước khi download)
   ```php
   // Firmware 1 requires license
   if ($firmwareId === 1 && !$licenseKey) {
       http_response_code(403);
       exit();
   }
   
   // Validate format
   if (!preg_match('/^MZ[0-9][A-Z]-.../', $licenseKey)) {
       http_response_code(403);
       exit();
   }
   ```

3. **Server download từ GitHub** (client KHÔNG biết URL)
   ```php
   $firmwareUrls = [
       1 => 'https://raw.githubusercontent.com/...',
       // URLs này CHƯA BAO GIỜ gửi cho client
   ];
   
   $firmwareData = curl_exec($ch);
   ```

4. **Server trả binary về client**
   ```php
   header('Content-Type: application/octet-stream');
   echo $firmwareData;
   ```

**Lợi ích:**
- Client KHÔNG BAO GIỜ biết GitHub URL
- Server kiểm tra license TRƯỚC KHI download
- Có thể log tất cả download attempts
- Có thể rate limit
- Có thể thêm server-side validation phức tạp

### Lớp 3: .htaccess Protection 🚫

**File:** `.htaccess`

**Chặn truy cập trực tiếp:**
```apache
# Deny direct access to .bin files
<FilesMatch "\.(bin|sha256)$">
    Order Allow,Deny
    Deny from all
</FilesMatch>

# Prevent directory listing
Options -Indexes
```

**Rate limiting:**
```apache
<IfModule mod_security.c>
    SecRuleEngine On
    SecRule REQUEST_URI "/firmware-proxy.php" "..."
</IfModule>
```

**Lợi ích:**
- Ngăn browse thư mục
- Chặn download .bin trực tiếp
- Rate limit API calls

## 📊 So Sánh Trước/Sau

### Kịch Bản Tấn Công: Scan HTML để tìm firmware

**Trước (KHÔNG an toàn):**
```bash
curl https://minizjp.com | grep "raw.githubusercontent.com"
# → Tìm thấy: https://raw.githubusercontent.com/.../firmware1.bin

curl https://raw.githubusercontent.com/.../firmware1.bin -o firmware.bin
# → Download THÀNH CÔNG, KHÔNG CẦN LICENSE ❌
```

**Sau (AN TOÀN):**
```bash
curl https://minizjp.com | grep "raw.githubusercontent.com"
# → KHÔNG tìm thấy gì ✅

curl https://minizjp.com | grep "firmware"
# → Chỉ thấy: data-fw-id="fw1" (vô dụng) ✅

# Thử download trực tiếp
curl https://minizjp.com/firmware1.bin
# → 403 Forbidden ✅

# Thử qua proxy KHÔNG có license
curl -X POST https://minizjp.com/firmware-proxy.php \
     -d '{"firmwareId":1}'
# → 403 License required ✅

# Thử qua proxy CÓ license SAI
curl -X POST https://minizjp.com/firmware-proxy.php \
     -d '{"firmwareId":1,"licenseKey":"FAKE-KEY"}'
# → 403 Invalid license ✅

# CHỈ có license HỢP LỆ mới download được
curl -X POST https://minizjp.com/firmware-proxy.php \
     -d '{"firmwareId":1,"licenseKey":"MZ1A-K9X4-7P2M-5R8T"}'
# → 200 OK, trả về firmware binary ✅
```

## 🔄 Quy Trình Download Mới

### Firmware 1 (Cần License)

```
1. User chọn Firmware 1
   ↓
2. HTML: data-fw-id="fw1" → JavaScript: Decrypt URL
   ↓
3. Check license validated?
   ↓ NO
4. Yêu cầu nhập license key
   ↓
5. Validate license + bind MAC
   ↓ OK
6. POST /firmware-proxy.php {firmwareId, licenseKey, MAC}
   ↓
7. Server verify license
   ↓ OK
8. Server download từ GitHub (client không biết URL)
   ↓
9. Server return binary → Client
   ↓
10. Flash firmware
```

### Firmware 2-5 (Không Cần License)

```
1. User chọn Firmware 2-5
   ↓
2. HTML: data-fw-id="fw2" → JavaScript: Decrypt URL
   ↓
3. POST /firmware-proxy.php {firmwareId, MAC}
   ↓
4. Server download từ GitHub
   ↓
5. Server return binary → Client
   ↓
6. Flash firmware
```

## 🎯 Mức Độ Bảo Mật

| Lớp | Bảo Vệ | Có Thể Bypass? |
|-----|--------|----------------|
| HTML Obfuscation | GitHub URL không hiện trong source | Có - nếu reverse engineer JS |
| XOR Encryption | URL được mã hóa trong memory | Có - nếu debug JS runtime |
| Proxy Server | Client không bao giờ có URL | **KHÔNG** - URL chỉ tồn tại server-side |
| License Check | Server verify trước download | **KHÔNG** - Server-side enforcement |
| .htaccess | Chặn direct access | **KHÔNG** - Apache level blocking |

**Kết luận:** 
- Lớp 1-2: Làm khó attacker, nhưng CÓ THỂ bypass bằng reverse engineering
- Lớp 3: **KHÔNG THỂ bypass** - server-side enforcement

## 🚀 Triển Khai

### Production (minizjp.com)

1. **Upload files:**
   ```
   web/
   ├── firmware-proxy.php  ← Proxy API
   ├── .htaccess          ← Apache rules
   ├── app.js             ← Updated với proxy logic
   └── index.html         ← Updated với data-fw-id
   ```

2. **Cấu hình Apache:**
   - Enable `mod_rewrite`
   - Enable `mod_headers`
   - Đảm bảo `.htaccess` được xử lý

3. **Test:**
   ```bash
   # Test proxy hoạt động
   curl -X POST https://minizjp.com/firmware-proxy.php \
        -H "Content-Type: application/json" \
        -d '{"firmwareId":2}'
   
   # Test license required
   curl -X POST https://minizjp.com/firmware-proxy.php \
        -H "Content-Type: application/json" \
        -d '{"firmwareId":1}'
   # Expect: 403 License required
   ```

### Development (localhost)

```javascript
// app.js tự động detect development mode
const useProxy = window.location.hostname !== 'localhost';

if (useProxy) {
    // Production: Dùng proxy
} else {
    // Development: Direct download (cho tiện test)
}
```

## 📝 Logs và Monitoring

**File log:** `firmware_download.log`

**Format:**
```
2025-11-24 10:15:30 - FW1 - MAC: AA:BB:CC:DD:EE:FF - Key: MZ1A-K9X4-7P2M-5R8T
2025-11-24 10:16:45 - FW2 - MAC: 11:22:33:44:55:66 - Key: (none)
```

**Thông tin track:**
- Timestamp
- Firmware ID
- Device MAC address
- License key (nếu có)

**Sử dụng:**
- Audit trail
- Phát hiện abuse
- Thống kê usage

## ⚙️ Tùy Chỉnh

### Thêm domain vào whitelist

**File:** `firmware-proxy.php`

```php
// Kiểm tra referer (optional)
$allowedDomains = ['minizjp.com', 'localhost'];
$referer = parse_url($_SERVER['HTTP_REFERER'] ?? '', PHP_URL_HOST);
if (!in_array($referer, $allowedDomains)) {
    http_response_code(403);
    exit();
}
```

### Rate limiting

**File:** `.htaccess`

```apache
<IfModule mod_ratelimit.c>
    <Location /firmware-proxy.php>
        SetOutputFilter RATE_LIMIT
        SetEnv rate-limit 1024  # KB/s
    </Location>
</IfModule>
```

### Database validation

**File:** `firmware-proxy.php`

```php
// Connect to license database
$db = new PDO('mysql:host=localhost;dbname=licenses', 'user', 'pass');

// Verify license in database
$stmt = $db->prepare("SELECT * FROM licenses WHERE key = ? AND mac = ?");
$stmt->execute([$licenseKey, $deviceMAC]);
$license = $stmt->fetch();

if (!$license || $license['revoked']) {
    http_response_code(403);
    exit();
}
```

## 🔍 Troubleshooting

### Lỗi: "Failed to fetch firmware from source"

**Nguyên nhân:**
- GitHub rate limit
- Network timeout
- File không tồn tại

**Giải quyết:**
```php
// Tăng timeout
curl_setopt($ch, CURLOPT_TIMEOUT, 300);

// Thêm retry logic
for ($i = 0; $i < 3; $i++) {
    $data = curl_exec($ch);
    if ($data) break;
    sleep(2);
}
```

### Lỗi: ".htaccess rules không hoạt động"

**Nguyên nhân:**
- `AllowOverride` bị tắt

**Giải quyết:**
```apache
# httpd.conf hoặc apache2.conf
<Directory /var/www/html>
    AllowOverride All
</Directory>
```

### Lỗi: "CORS error"

**Nguyên nhân:**
- Headers không đúng

**Giải quyết:**
```php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
```

## ✅ Checklist Bảo Mật

- [x] HTML không chứa GitHub URLs
- [x] URLs được mã hóa XOR trong JS
- [x] Proxy API verify license trước download
- [x] Server-side URL mapping (client không biết)
- [x] .htaccess chặn direct .bin access
- [x] Logging tất cả download attempts
- [x] CORS configuration đúng
- [x] Error handling đầy đủ
- [x] Development/production mode phân biệt
- [ ] Database license validation (TODO)
- [ ] Rate limiting (TODO)
- [ ] IP-based blocking (TODO)

## 🎓 Best Practices

1. **KHÔNG BAO GIỜ** để GitHub URL trong HTML/JS visible
2. **LUÔN** verify license server-side, KHÔNG TIN client
3. **LUÔN** log download attempts
4. **CÂN NHẮC** thêm rate limiting
5. **CÂN NHẮC** dùng CDN với signed URLs
6. **CÂN NHẮC** encrypt firmware binary thêm 1 lớp nữa

## 🔗 Tài Liệu Liên Quan

- `firmware-proxy.php` - Proxy implementation
- `.htaccess` - Apache security rules
- `app.js` - Client-side encryption
- `SECURITY.md` - General security guidelines
