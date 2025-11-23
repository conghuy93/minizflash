# ESP Web Flasher - MiniZ Flash

Web-based ESP32/ESP8266 firmware flasher using Web Serial API.

## 🚀 Features

- ✅ Flash firmware directly from browser
- ✅ No installation required
- ✅ Supports ESP32, ESP8266, ESP32-S2, ESP32-S3, ESP32-C3, and more
- ✅ Real-time progress tracking
- ✅ Auto chip detection
- ✅ Configurable flash options
- ✅ Modern, responsive UI

## 🌐 Browser Requirements

This tool requires a browser with Web Serial API support:
- ✅ Chrome/Chromium 89+
- ✅ Edge 89+
- ✅ Opera 75+
- ❌ Firefox (not supported yet)
- ❌ Safari (not supported yet)

## 📦 How to Use

### Online (GitHub Pages)

1. Visit: https://conghuy93.github.io/minizflash/
2. Connect your ESP device via USB
3. Click "Connect to Device"
4. Select your device from the popup
5. Choose your firmware file (.bin)
6. Configure flash options (optional)
7. Click "Start Flash"

### Local Development

1. Clone this repository:
```bash
git clone https://github.com/conghuy93/minizflash.git
cd minizflash/web
```

2. Serve the files with a local web server:
```bash
# Using Python
python -m http.server 8000

# Or using Node.js
npx http-server -p 8000
```

3. Open browser: http://localhost:8000

## 🔧 Flash Options

- **Flash Offset**: Memory address to write firmware (usually 0x0000)
- **Baud Rate**: Communication speed (higher = faster, but may be unstable)
- **Flash Mode**: 
  - DIO (Dual I/O) - Default, most compatible
  - QIO (Quad I/O) - Faster, requires 4 data lines
  - DOUT (Dual Output)
  - QOUT (Quad Output)
- **Flash Frequency**: SPI flash clock frequency
- **Erase Flash**: Erase entire flash before writing (recommended for first flash)

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Flash Tool**: [esptool-js](https://github.com/espressif/esptool-js)
- **API**: Web Serial API
- **Styling**: Custom CSS with dark theme

## 📁 Project Structure

```
web/
├── index.html      # Main HTML page
├── styles.css      # Styling and theme
├── app.js          # Main application logic
└── README.md       # This file
```

## 🔒 Security & Privacy

- All operations happen locally in your browser
- No data is sent to any server
- Firmware files are processed in-memory only
- Source code is open and auditable

## 🐛 Troubleshooting

### "Web Serial API not supported"
- Use Chrome, Edge, or Opera browser
- Update to the latest browser version

### "Failed to open serial port"
- Make sure no other program is using the port
- Try disconnecting and reconnecting the device
- Close other serial monitors (Arduino IDE, PlatformIO, etc.)

### Flash failed / Verification error
- Try lower baud rate (115200)
- Check USB cable quality
- Ensure firmware file is for your chip model
- Try erasing flash before writing

### Device not detected
- Install CH340/CP210x USB drivers if needed
- Put device in bootloader mode manually (hold BOOT, press RESET)
- Check Device Manager (Windows) or `ls /dev/tty*` (Linux/Mac)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Credits

- Built with [esptool-js](https://github.com/espressif/esptool-js) by Espressif Systems
- Inspired by [ESP Web Tools](https://esphome.github.io/esp-web-tools/)
- Icons and emojis for better UX

## 📞 Support

- GitHub Issues: https://github.com/conghuy93/minizflash/issues
- Documentation: https://docs.espressif.com/projects/esptool/

---

**Made with ❤️ for the ESP community**
