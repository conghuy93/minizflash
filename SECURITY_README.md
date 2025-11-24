# 🔒 Firmware Security System

## Tóm Tắt Nhanh

**Vấn đề:** HTML chứa plain-text GitHub URLs → Ai cũng download được firmware mà không cần license

**Giải pháp:** 3 lớp bảo mật:

1. **HTML Obfuscation** - Không lưu URLs, chỉ lưu IDs
2. **Server Proxy** - Download qua backend, verify license trước
3. **Apache Rules** - Chặn direct access vào .bin files

## Files

- `firmware-proxy.php` - Server-side proxy (verify license + download)
- `.htaccess` - Apache security rules
- `app.js` - XOR encryption cho URLs
- `index.html` - Sử dụng `data-fw-id` thay vì `data-url`
- `FIRMWARE_SECURITY.md` - Documentation đầy đủ
- `test_security.sh` - Script test bảo mật

## Quick Test

```bash
# Kiểm tra không có GitHub URLs trong HTML
curl https://minizjp.com | grep "raw.githubusercontent.com"
# → Không tìm thấy ✅

# Thử download trực tiếp
curl https://minizjp.com/firmware1.bin
# → 403 Forbidden ✅

# Thử download không có license
curl -X POST https://minizjp.com/firmware-proxy.php \
     -H "Content-Type: application/json" \
     -d '{"firmwareId":1}'
# → 403 License required ✅
```

## Deploy

**GitHub Pages (Static - Lớp 1 only):**
- ✅ XOR encryption hoạt động
- ❌ Proxy không hoạt động (cần PHP)
- ✅ Development mode fallback

**PHP Server (Full Security):**
1. Upload tất cả files
2. Ensure Apache `mod_rewrite` enabled
3. Test với `test_security.sh`

## Docs

Xem `FIRMWARE_SECURITY.md` để biết chi tiết đầy đủ về:
- Architecture diagram
- Attack scenarios
- Configuration options
- Troubleshooting
- Best practices
