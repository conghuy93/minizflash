# 🚀 Quick Start - ESP Web Flasher

## ✅ Đã tạo xong!

Cấu trúc file:

```
web/
├── index.html          ✅ Trang chính
├── styles.css          ✅ Giao diện đẹp với dark theme
├── app.js              ✅ Logic flash firmware
├── README.md           ✅ Hướng dẫn sử dụng
├── LICENSE             ✅ MIT License
├── .gitignore          ✅ Ignore files
├── start_server.bat    ✅ Windows server launcher
└── start_server.sh     ✅ Linux/Mac server launcher
```

## 🎯 Test Ngay (Local)

### Windows:
```bash
cd web
start_server.bat
```

### Linux/Mac:
```bash
cd web
chmod +x start_server.sh
./start_server.sh
```

Sau đó mở browser: **http://localhost:8000**

## 🌐 Deploy lên GitHub Pages

### Bước 1: Tạo repo GitHub
```bash
# Tại thư mục web/
git init
git add .
git commit -m "Initial commit: ESP Web Flasher"
git remote add origin https://github.com/conghuy93/minizflash.git
git branch -M main
git push -u origin main
```

### Bước 2: Enable GitHub Pages
1. Vào https://github.com/conghuy93/minizflash/settings/pages
2. Source: **GitHub Actions** (đã có file workflow)
3. Đợi 2-3 phút
4. Truy cập: **https://conghuy93.github.io/minizflash/**

## 📖 Hướng dẫn chi tiết

- **Deploy Guide**: `DEPLOY_GUIDE.md`
- **Full README**: `GITHUB_PAGES_README.md`
- **Web App README**: `web/README.md`

## 🔥 Tính năng

✅ Flash firmware trực tiếp từ browser
✅ Không cần cài đặt gì
✅ Support ESP32, ESP32-S2/S3/C3/C6, ESP8266
✅ Hiển thị progress realtime với phần trăm
✅ Auto detect chip
✅ Dark theme đẹp mắt
✅ Responsive cho mobile

## 🌐 Browser yêu cầu

- ✅ Chrome/Chromium 89+
- ✅ Edge 89+
- ✅ Opera 75+
- ❌ Firefox (chưa support Web Serial API)
- ❌ Safari (chưa support Web Serial API)

## 🎨 Screenshots

Giao diện bao gồm:
- Header với logo và link GitHub
- Card kết nối device với status badge
- File selector với info hiển thị
- Flash options (offset, baud, mode, freq)
- Progress bar với phần trăm rõ ràng
- Console output với color coding
- Footer với credits

## 🚀 Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Modern styling với variables, gradients
- **JavaScript ES6+** - Async/await, modules
- **Web Serial API** - USB communication
- **esptool-js** - ESP flash engine

## 📦 Không cần build

Tất cả files là vanilla HTML/CSS/JS - không cần:
- ❌ npm install
- ❌ webpack/vite build
- ❌ transpile/compile

Chỉ cần serve static files!

## 🔒 Privacy & Security

- ✅ Tất cả xử lý local trong browser
- ✅ Không gửi data lên server
- ✅ Firmware files xử lý in-memory
- ✅ Open source - audit được
- ✅ Không có tracking

## 🎯 Next Steps

1. **Test local**: Chạy server và test flash
2. **Push to GitHub**: Tạo repo và push code
3. **Enable Pages**: Kích hoạt GitHub Pages
4. **Share**: Chia sẻ link với cộng đồng!

## 💡 Tips

- Dùng baud rate cao (921600) cho flash nhanh
- Enable "Erase Flash" cho lần flash đầu
- Nếu lỗi, thử baud rate thấp hơn (115200)
- Check USB cable quality nếu flash chậm
- Close serial monitors khác trước khi flash

## 🆘 Support

- GitHub Issues: https://github.com/conghuy93/minizflash/issues
- ESP32 Forum: https://esp32.com/
- Espressif Docs: https://docs.espressif.com/

---

**Happy Flashing! 🎉**
