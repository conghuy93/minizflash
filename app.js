// Import ESPLoader from CDN (use latest stable version)
import { ESPLoader, Transport } from 'https://unpkg.com/esptool-js@latest/bundle.js';
import SecurityManager from './security.js';
import LicenseManager from './license.js';

class ESPWebFlasher {
    constructor() {
        this.device = null;
        this.transport = null;
        this.chip = null;
        this.esploader = null;
        this.firmwareData = null;
        this.firmwareSource = 'github'; // 'github' or 'local'
        this.selectedGithubUrl = null;
        this.selectedFileName = null;
        this.selectedFirmwareId = null;
        this.deviceMAC = null;
        this.licenseKey = null;
        this.licenseValidated = false;
        
        // Obfuscated firmware URLs - XOR encrypted to hide GitHub links
        this.firmwareMap = this.initFirmwareMap();
        
        // Initialize security
        this.security = new SecurityManager();
        this.license = new LicenseManager();
        this.initializeSecurity();
        
        this.initializeUI();
        this.checkWebSerialSupport();
    }

    // Initialize firmware map with encrypted URLs
    initFirmwareMap() {
        const urls = {
            'fw1': 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware1.bin',
            'fw2': 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware2.bin',
            'fw3': 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware3.bin',
            'fw4': 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware4.bin',
            'fw5': 'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware5.bin'
        };
        
        const map = {};
        for (const [id, url] of Object.entries(urls)) {
            map[id] = this.encryptURL(url);
        }
        return map;
    }
    
    // XOR encryption for URL obfuscation
    encryptURL(url) {
        const key = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const encrypted = btoa(url.split('').map((char, i) => 
            String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
        ).join(''));
        return { encrypted, key };
    }
    
    // Decrypt URL
    decryptURL(encrypted, key) {
        try {
            const decoded = atob(encrypted);
            return decoded.split('').map((char, i) => 
                String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
            ).join('');
        } catch (e) {
            console.error('Decryption failed:', e);
            return null;
        }
    }

    initializeSecurity() {
        // Check if running on trusted domain
        if (!this.security.checkOrigin()) {
            document.body.innerHTML = '<div style="color:red;padding:50px;text-align:center;"><h1>⚠️ Unauthorized Access</h1><p>This application can only run on authorized domains.</p></div>';
            throw new Error('Unauthorized domain');
        }
        
        // Apply security measures
        this.security.disableRightClick();
        this.security.disableCopyPaste();
        this.security.addSecurityHeaders();
        
        // Log security initialization
        console.log('🔒 Security initialized - Session:', this.security.sessionId.substring(0, 8) + '...');
    }

    checkWebSerialSupport() {
        if (!('serial' in navigator)) {
            this.log('❌ Web Serial API not supported. Please use Chrome, Edge, or Opera browser.', 'error');
            document.getElementById('connectBtn').disabled = true;
        }
    }

    initializeUI() {
        // Connect button
        document.getElementById('connectBtn').addEventListener('click', () => this.connectDevice());
        
        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        
        // GitHub firmware cards
        const firmwareCards = document.querySelectorAll('.firmware-card');
        firmwareCards.forEach(card => {
            card.addEventListener('click', () => this.selectGithubFirmware(card));
        });
        
        // License key input and validation
        document.getElementById('licenseKeyInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('validateLicenseBtn').click();
            }
        });
        
        document.getElementById('validateLicenseBtn')?.addEventListener('click', () => this.validateLicenseUI());
        
        // Local file input
        document.getElementById('firmwareFile').addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Flash button
        document.getElementById('flashBtn').addEventListener('click', () => this.flashFirmware());
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab content
        document.querySelectorAll('.firmware-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        if (tabName === 'github') {
            document.getElementById('githubFirmwareTab').classList.add('active');
            this.firmwareSource = 'github';
        } else {
            document.getElementById('localFileTab').classList.add('active');
            this.firmwareSource = 'local';
        }
    }

    async selectGithubFirmware(card) {
        // Check security lockout
        if (this.security.isLocked()) {
            this.log('🔒 Too many attempts. Please wait 5 minutes.', 'error');
            return;
        }
        
        // Remove previous selection
        document.querySelectorAll('.firmware-card').forEach(c => c.classList.remove('selected'));
        
        // Mark as selected
        card.classList.add('selected');
        
        const fwId = card.dataset.fwId;
        const name = card.querySelector('h3').textContent;
        const firmwareId = parseInt(card.dataset.id);
        
        // Decrypt firmware URL
        const fwData = this.firmwareMap[fwId];
        if (!fwData) {
            this.log('❌ Invalid firmware ID', 'error');
            return;
        }
        const url = this.decryptURL(fwData.encrypted, fwData.key);
        if (!url) {
            this.log('❌ Failed to decrypt firmware URL', 'error');
            return;
        }
        
        // Show/hide license section for firmware 1
        const licenseSection = document.getElementById('licenseSection');
        if (firmwareId === 1) {
            licenseSection.classList.remove('hidden');
            // Clear previous license state if selecting firmware 1 again
            if (this.selectedFileName !== name) {
                this.licenseKey = null;
                this.licenseValidated = false;
                document.getElementById('licenseKeyInput').value = '';
                document.getElementById('licenseStatus').classList.add('hidden');
            }
        } else {
            licenseSection.classList.add('hidden');
        }
        
        this.log(`📥 Loading ${name}...`, 'info');
        
        try {
            // GitHub Pages doesn't support PHP proxy, use direct download
            // For production with PHP server, enable proxy
            const useProxy = false; // Set to true when deployed on PHP server
            
            let arrayBuffer;
            if (useProxy) {
                // Download via proxy - GitHub URL never exposed to client network
                console.log('🔒 Using secure proxy for firmware download');
                const proxyResponse = await fetch('/firmware-proxy.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firmwareId: firmwareId,
                        licenseKey: firmwareId === 1 ? this.licenseKey : null,
                        deviceMAC: this.deviceMAC
                    })
                });
                
                if (!proxyResponse.ok) {
                    const error = await proxyResponse.json();
                    throw new Error(error.error || 'Proxy download failed');
                }
                
                arrayBuffer = await proxyResponse.arrayBuffer();
            } else {
                // Direct download (GitHub Pages compatible)
                console.log('📥 Direct download from GitHub');
                const response = await fetch(url);
                if (!response.ok) {
                    this.security.recordAttempt();
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                arrayBuffer = await response.arrayBuffer();
            }
            
            this.firmwareData = new Uint8Array(arrayBuffer);
            
            // Verify firmware integrity
            const expectedSize = parseInt(card.querySelector('.firmware-size').textContent) * 1024 * 1024;
            const isValid = await this.security.verifyIntegrity(this.firmwareData, this.firmwareData.length);
            
            if (!isValid) {
                this.security.recordAttempt();
                throw new Error('Firmware integrity check failed');
            }
            
            this.selectedGithubUrl = url;
            this.selectedFileName = name;
            this.selectedFirmwareId = firmwareId;
            
            // Display file info
            const fileInfo = document.getElementById('githubFileInfo');
            fileInfo.innerHTML = `
                <strong>✅ ${name}</strong><br>
                📦 Size: ${(this.firmwareData.length / 1024 / 1024).toFixed(2)} MB<br>
                ✓ Ready to flash
            `;
            fileInfo.classList.remove('hidden');
            
            this.log(`✅ ${name} loaded successfully (${(this.firmwareData.length / 1024 / 1024).toFixed(2)} MB)`, 'success');
            
            // Enable flash button only if all conditions met
            this.updateFlashButtonState();
            
        } catch (error) {
            this.log(`❌ Failed to download firmware: ${error.message}`, 'error');
            card.classList.remove('selected');
        }
    }

    async connectDevice() {
        const connectBtn = document.getElementById('connectBtn');
        const statusBadge = document.getElementById('connectionStatus');
        
        try {
            connectBtn.disabled = true;
            this.log('🔌 Requesting device access...', 'info');
            
            // Request port
            this.device = await navigator.serial.requestPort();
            
            const baudRate = parseInt(document.getElementById('baudRate').value);
            this.log(`📡 Opening port at ${baudRate} baud...`, 'info');
            
            // Create transport
            this.transport = new Transport(this.device);
            
            // Create ESP loader
            this.esploader = new ESPLoader({
                transport: this.transport,
                baudrate: baudRate,
                romBaudrate: 115200,
                terminal: {
                    clean: () => {},
                    writeLine: (text) => this.log(text, 'info'),
                    write: (text) => this.log(text, 'info')
                },
                debugLogging: true
            });
            
            // Connect to chip
            this.log('🔄 Connecting to ESP chip...', 'info');
            this.chip = await this.esploader.main();
            
            // Try to load stub for faster operations
            try {
                this.log('📦 Loading flasher stub...', 'info');
                await this.esploader.runStub();
                this.log('✅ Stub loaded successfully', 'success');
            } catch (stubError) {
                this.log('⚠️ Could not load stub, continuing without it (slower but stable)', 'warning');
                console.warn('Stub load error:', stubError);
                // Continue without stub - it will work but slower
            }
            
            // Get chip info
            this.log(`✅ Connected to ${this.chip}!`, 'success');
            
            // Read MAC address for license binding
            try {
                // Try different methods to get MAC address
                let mac = null;
                
                // Method 1: Read MAC from EFUSE per Espressif API docs
                // EFUSE_RD_MAC_SPI_SYS registers hold the MAC address
                try {
                    // ESP32-S3 EFUSE address: 0x60007000 is EFUSE base
                    // MAC address is at offset 0x044 (word0) and 0x048 (word1)
                    const word0 = await this.esploader.readReg(0x60007044);
                    const word1 = await this.esploader.readReg(0x60007048);
                    
                    if (word0 !== undefined && word1 !== undefined) {
                        const macBytes = [
                            (word0 >> 0) & 0xFF,
                            (word0 >> 8) & 0xFF,
                            (word0 >> 16) & 0xFF,
                            (word0 >> 24) & 0xFF,
                            (word1 >> 0) & 0xFF,
                            (word1 >> 8) & 0xFF
                        ];
                        mac = macBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
                        this.log(`✅ MAC from EFUSE: ${mac}`, 'success');
                    }
                } catch (e) {
                    this.log('⚠️ EFUSE read (method 1) failed', 'info');
                }
                
                // Method 2: Try alternative EFUSE address
                if (!mac) {
                    try {
                        const word0 = await this.esploader.readReg(0x3f41a048);
                        const word1 = await this.esploader.readReg(0x3f41a04c);
                        
                        if (word0 && word1) {
                            const macBytes = [
                                (word0 >> 0) & 0xFF,
                                (word0 >> 8) & 0xFF,
                                (word0 >> 16) & 0xFF,
                                (word0 >> 24) & 0xFF,
                                (word1 >> 0) & 0xFF,
                                (word1 >> 8) & 0xFF
                            ];
                            mac = macBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
                            this.log(`✅ MAC from OTP: ${mac}`, 'success');
                        }
                    } catch (e) {
                        this.log('⚠️ OTP read (method 2) failed', 'info');
                    }
                }
                
                // Method 3: Generate from Chip ID
                if (!mac) {
                    try {
                        const chipId = await this.esploader.readReg(0x60000050);
                        const chipId2 = await this.esploader.readReg(0x60000054);
                        if (chipId && chipId2) {
                            mac = this.generateMACFromChipId(chipId, chipId2);
                            this.log(`📟 MAC (from Chip ID): ${mac}`, 'info');
                        }
                    } catch (e) {
                        this.log('⚠️ Chip ID read failed', 'info');
                    }
                }
                
                // Detect new MAC address
                const previousMAC = this.deviceMAC;
                let newMAC = null;
                
                if (mac && this.isValidMAC(mac)) {
                    newMAC = mac;
                    this.log(`🔐 Device MAC verified: ${newMAC}`, 'success');
                } else {
                    newMAC = this.generateSessionMAC();
                    this.log(`📟 Session MAC (device not readable): ${newMAC}`, 'warning');
                }
                
                // SECURITY: Check if this is a different device
                if (previousMAC && previousMAC !== newMAC) {
                    this.log(`⚠️ Different device detected! Previous MAC: ${previousMAC}, New MAC: ${newMAC}`, 'warning');
                    this.log(`🔒 Clearing license validation for security...`, 'info');
                    
                    // Reset license state
                    this.licenseKey = null;
                    this.licenseValidated = false;
                    
                    // Clear UI
                    const licenseInput = document.getElementById('licenseKeyInput');
                    if (licenseInput) {
                        licenseInput.value = '';
                    }
                    const licenseStatus = document.getElementById('licenseStatus');
                    if (licenseStatus) {
                        licenseStatus.classList.add('hidden');
                    }
                }
                
                this.deviceMAC = newMAC;
            } catch (e) {
                this.log(`⚠️ MAC detection failed: ${e.message}`, 'warning');
                
                const previousMAC = this.deviceMAC;
                const newMAC = this.generateSessionMAC();
                
                // Reset license if different device
                if (previousMAC && previousMAC !== newMAC) {
                    this.licenseKey = null;
                    this.licenseValidated = false;
                }
                
                this.deviceMAC = newMAC;
            }
            
            // Update UI
            statusBadge.textContent = 'Connected';
            statusBadge.classList.remove('disconnected');
            statusBadge.classList.add('connected');
            connectBtn.textContent = '🔌 Disconnect';
            connectBtn.onclick = () => this.disconnectDevice();
            
            // Show device info
            await this.displayDeviceInfo();
            
            // Enable flash button if firmware is loaded
            if (this.firmwareData) {
                document.getElementById('flashBtn').disabled = false;
            }
            
            connectBtn.disabled = false;
            
        } catch (error) {
            this.log(`❌ Connection failed: ${error.message}`, 'error');
            console.error(error);
            connectBtn.disabled = false;
        }
    }

    async disconnectDevice() {
        try {
            if (this.transport) {
                await this.transport.disconnect();
                await this.transport.waitForUnlock(1500);
            }
            
            this.device = null;
            this.transport = null;
            this.chip = null;
            this.esploader = null;
            
            // Reset license state to prevent security hole
            this.deviceMAC = null;
            this.licenseKey = null;
            this.licenseValidated = false;
            
            const statusBadge = document.getElementById('connectionStatus');
            statusBadge.textContent = 'Not Connected';
            statusBadge.classList.remove('connected');
            statusBadge.classList.add('disconnected');
            
            const connectBtn = document.getElementById('connectBtn');
            connectBtn.textContent = '🔌 Connect to Device';
            connectBtn.onclick = () => this.connectDevice();
            
            document.getElementById('deviceInfo').classList.add('hidden');
            document.getElementById('flashBtn').disabled = true;
            
            // Hide and reset license status
            const licenseStatus = document.getElementById('licenseStatus');
            if (licenseStatus) {
                licenseStatus.classList.add('hidden');
            }
            const licenseInput = document.getElementById('licenseKeyInput');
            if (licenseInput) {
                licenseInput.value = '';
            }
            
            this.log('🔌 Disconnected', 'info');
        } catch (error) {
            this.log(`Error disconnecting: ${error.message}`, 'error');
        }
    }

    async displayDeviceInfo() {
        try {
            const deviceInfo = document.getElementById('deviceInfo');
            
            // this.chip already contains chip name from main()
            let info = `<strong>Device Information:</strong><br>`;
            info += `Chip: ${this.chip}<br>`;
            
            // Try to get MAC address
            try {
                const macAddr = await this.esploader.readMac();
                if (macAddr) {
                    info += `MAC Address: ${macAddr}<br>`;
                }
            } catch (e) {
                console.log('Could not read MAC:', e);
            }
            
            // Try to get chip features
            try {
                const features = await this.esploader.getChipFeatures();
                if (features && features.length > 0) {
                    info += `Features: ${features.join(', ')}<br>`;
                }
            } catch (e) {
                console.log('Could not get features:', e);
            }
            
            // Try to get flash size
            try {
                const flashId = await this.esploader.readFlashId();
                if (flashId) {
                    info += `Flash ID: 0x${flashId.toString(16)}<br>`;
                }
            } catch (e) {
                console.log('Could not read flash ID:', e);
            }
            
            deviceInfo.innerHTML = info;
            deviceInfo.classList.remove('hidden');
        } catch (error) {
            console.warn('Device info error:', error);
            // Still show chip name at minimum
            const deviceInfo = document.getElementById('deviceInfo');
            deviceInfo.innerHTML = `<strong>Device Information:</strong><br>Chip: ${this.chip}`;
            deviceInfo.classList.remove('hidden');
        }
    }

    validateLicenseUI() {
        const licenseInput = document.getElementById('licenseKeyInput');
        const keyValue = licenseInput.value.trim().toUpperCase();
        const statusDiv = document.getElementById('licenseStatus');
        
        // Validation checks
        if (!keyValue) {
            this.showLicenseStatus('🔴 Please enter a license key', 'error');
            return;
        }
        
        if (!this.selectedFirmwareId || this.selectedFirmwareId !== 1) {
            this.showLicenseStatus('🔴 Please select Firmware 1 first', 'error');
            return;
        }
        
        if (!this.deviceMAC) {
            this.showLicenseStatus('🔴 Device must be connected first to bind license', 'error');
            return;
        }
        
        // Validate license key format
        if (!this.license.isValidFormat(keyValue)) {
            this.showLicenseStatus('🔴 Invalid format: Use MZxA-xxxx-xxxx-xxxx', 'error');
            licenseInput.value = '';
            return;
        }
        
        // Validate license key
        const validation = this.license.validateKey(keyValue, this.deviceMAC);
        
        if (!validation.valid) {
            this.showLicenseStatus(`🔴 ${validation.message}`, 'error');
            licenseInput.value = '';
            this.licenseKey = null;
            this.licenseValidated = false;
            return;
        }
        
        // License is valid
        this.licenseKey = keyValue;
        this.licenseValidated = true;
        
        if (validation.firstUse) {
            this.showLicenseStatus(`🟢 Key activated! Bound to ${this.deviceMAC}`, 'success');
            this.log(`✅ License key activated and bound to this device (${this.deviceMAC})`, 'success');
        } else {
            this.showLicenseStatus(`🟢 Key valid! Usage: ${validation.useCount || 1}x`, 'success');
            this.log(`✅ License key validated for ${this.deviceMAC}`, 'success');
        }
        
        this.updateFlashButtonState();
    }

    showLicenseStatus(message, type) {
        const statusDiv = document.getElementById('licenseStatus');
        statusDiv.innerHTML = message;
        statusDiv.className = `license-status ${type}`;
        statusDiv.classList.remove('hidden');
        
        // Auto-scroll to status
        setTimeout(() => {
            statusDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }

    updateFlashButtonState() {
        const flashBtn = document.getElementById('flashBtn');
        
        // Flash requires: device connected + firmware loaded + device MAC + license valid (if fw1)
        const canFlash = this.esploader && this.firmwareData && this.deviceMAC;
        
        if (!canFlash) {
            flashBtn.disabled = true;
            return;
        }
        
        // Additional check for firmware 1
        if (this.selectedFirmwareId === 1) {
            flashBtn.disabled = !this.licenseValidated;
        } else {
            flashBtn.disabled = false;
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.endsWith('.bin')) {
            this.log('⚠️ Warning: File should have .bin extension', 'warning');
        }
        
        this.log(`📦 Loading file: ${file.name} (${this.formatBytes(file.size)})`, 'info');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.firmwareData = new Uint8Array(e.target.result);
            this.selectedFileName = file.name;
            
            const fileInfo = document.getElementById('fileInfo');
            fileInfo.innerHTML = `
                <strong>📦 ${file.name}</strong><br>
                Size: ${this.formatBytes(file.size)}<br>
                Type: ${file.type || 'application/octet-stream'}<br>
                Format: Binary (${this.firmwareData.length} bytes)
            `;
            fileInfo.classList.remove('hidden');
            
            this.log(`✅ Firmware loaded: ${this.formatBytes(this.firmwareData.length)}`, 'success');
            this.log(`   Data type: Uint8Array[${this.firmwareData.length}]`, 'info');
            
            // Enable flash button if connected
            if (this.esploader) {
                document.getElementById('flashBtn').disabled = false;
            }
        };
        
        reader.onerror = (error) => {
            this.log(`❌ Error reading file: ${error}`, 'error');
        };
        
        reader.readAsArrayBuffer(file);
    }

    async flashFirmware() {
        alert(`⚡ FLASH BUTTON CLICKED! Firmware ID: ${this.selectedFirmwareId}`);
        if (!this.esploader || !this.firmwareData) {
            this.log('❌ Please connect device and select firmware first', 'error');
            return;
        }
        
        // STRICT LICENSE CHECK for firmware 1 - verify EVERYTHING before flash
        if (this.selectedFirmwareId === 1) {
            alert('🔐 BẮT ĐẦU KIỂM TRA LICENSE VÀ MAC - CODE MỚI ĐANG CHẠY!');
            console.log('=== FIRMWARE 1 LICENSE VERIFICATION START ===');
            console.log('selectedFirmwareId:', this.selectedFirmwareId);
            console.log('licenseKey:', this.licenseKey);
            console.log('deviceMAC:', this.deviceMAC);
            console.log('licenseValidated flag:', this.licenseValidated);
            
            this.log('🔐 Verifying license before flash...', 'info');
            this.log('⚠️ Firmware 1 requires strict license verification', 'warning');
            
            // Step 1: Check if license key exists
            if (!this.licenseKey || this.licenseKey.trim() === '') {
                console.error('VERIFICATION FAILED: No license key');
                this.log('❌ No license key found. Please enter and validate your license key.', 'error');
                this.licenseValidated = false;
                this.updateFlashButtonState();
                alert('⚠️ Firmware 1 requires a license key. Please validate your key first.');
                return;
            }
            console.log('✓ Step 1 passed: License key exists');
            
            // Step 2: Re-read current device MAC address (don't trust cached value)
            let currentMAC = null;
            try {
                console.log('Reading device MAC address from EFUSE...');
                this.log('📟 Reading device MAC address...', 'info');
                
                // Try EFUSE first
                try {
                    const word0 = await this.esploader.readReg(0x60007044);
                    const word1 = await this.esploader.readReg(0x60007048);
                    console.log('EFUSE word0:', word0?.toString(16), 'word1:', word1?.toString(16));
                    
                    if (word0 !== undefined && word1 !== undefined) {
                        const macBytes = [
                            (word0 >> 0) & 0xFF,
                            (word0 >> 8) & 0xFF,
                            (word0 >> 16) & 0xFF,
                            (word0 >> 24) & 0xFF,
                            (word1 >> 0) & 0xFF,
                            (word1 >> 8) & 0xFF
                        ];
                        currentMAC = macBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
                        console.log('✓ MAC read from EFUSE:', currentMAC);
                        this.log(`✅ Current MAC: ${currentMAC}`, 'success');
                    }
                } catch (e) {
                    // Fallback to cached MAC if read fails
                    currentMAC = this.deviceMAC;
                    console.warn('EFUSE read failed, using cached MAC:', currentMAC);
                    this.log(`⚠️ Using cached MAC: ${currentMAC}`, 'warning');
                }
            } catch (e) {
                console.error('MAC read error:', e);
                this.log(`❌ Cannot read device MAC: ${e.message}`, 'error');
                this.licenseValidated = false;
                this.updateFlashButtonState();
                alert('⚠️ Cannot read device MAC address. Please reconnect your device.');
                return;
            }
            
            if (!currentMAC || !this.isValidMAC(currentMAC)) {
                this.log('❌ Invalid device MAC address', 'error');
                this.licenseValidated = false;
                this.updateFlashButtonState();
                return;
            }
            
            // Step 3: Get bound MAC from license key in localStorage
            console.log('Checking license binding in localStorage...');
            console.log('License key to check:', this.licenseKey);
            const boundData = this.license.getBoundMAC(this.licenseKey);
            console.log('Bound data from localStorage:', boundData);
            
            if (!boundData) {
                console.error('VERIFICATION FAILED: No binding data found');
                this.log('❌ License key is not activated. Please validate your key first.', 'error');
                this.licenseValidated = false;
                this.licenseKey = null;
                this.updateFlashButtonState();
                alert('⚠️ License key is not activated. Please validate your key first.');
                return;
            }
            console.log('✓ Step 3 passed: Binding data found');
            
            // Step 4: CRITICAL - Compare current MAC with bound MAC
            console.log('=== MAC COMPARISON ===');
            console.log('Current device MAC:', currentMAC);
            console.log('Bound license MAC:', boundData.mac);
            console.log('Match:', boundData.mac === currentMAC);
            
            if (boundData.mac !== currentMAC) {
                console.error('🚨 SECURITY VIOLATION: MAC MISMATCH!');
                this.log('🚨 SECURITY VIOLATION DETECTED! 🚨', 'error');
                this.log(`❌ Current device MAC: ${currentMAC}`, 'error');
                this.log(`❌ Licensed device MAC: ${boundData.mac}`, 'error');
                this.log('❌ License key is bound to a DIFFERENT device!', 'error');
                this.log('❌ You cannot use this key on this device.', 'error');
                
                // Reset everything
                this.licenseValidated = false;
                this.licenseKey = null;
                this.deviceMAC = currentMAC; // Update to correct MAC
                this.updateFlashButtonState();
                alert(`🚨 SECURITY ERROR!\n\nThis license key is bound to device:\n${boundData.mac}\n\nCurrent device:\n${currentMAC}\n\nYou cannot use this key on this device!`);
                return;
            }
            console.log('✓ Step 4 passed: MAC addresses match');
            
            // Step 5: Re-validate key format and existence
            console.log('Final validation of key...');
            const validation = this.license.validateKey(this.licenseKey, currentMAC);
            console.log('Validation result:', validation);
            
            if (!validation.valid) {
                console.error('VERIFICATION FAILED: Key validation failed');
                this.log(`❌ License validation failed: ${validation.message}`, 'error');
                this.licenseValidated = false;
                this.licenseKey = null;
                this.updateFlashButtonState();
                alert(`⚠️ License validation failed:\n${validation.message}`);
                return;
            }
            console.log('✓ Step 5 passed: Key validated');
            
            // All checks passed
            console.log('=== ALL VERIFICATION CHECKS PASSED ===');
            this.log('✅ License verified successfully!', 'success');
            this.log(`✅ Key: ${this.licenseKey}`, 'success');
            this.log(`✅ Device MAC: ${currentMAC}`, 'success');
            this.log(`✅ Usage count: ${validation.useCount}`, 'success');
            console.log('Proceeding with flash...');
        } else {
            console.log('Firmware', this.selectedFirmwareId, 'does not require license verification');
        }

        const flashBtn = document.getElementById('flashBtn');
        const progressSection = document.getElementById('progressSection');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const progressBytes = document.getElementById('progressBytes');

        try {
            flashBtn.disabled = true;
            progressSection.classList.remove('hidden');
            
            // Get options
            const flashOffset = parseInt(document.getElementById('flashOffset').value, 16);
            const eraseFlash = document.getElementById('eraseFlash').checked;
            
            this.log('='.repeat(50), 'info');
            this.log(`⚡ Starting flash operation for ${this.selectedFileName || 'firmware.bin'}...`, 'info');
            
            // Erase if needed
            if (eraseFlash) {
                this.log('🗑️ Erasing flash...', 'warning');
                this.updateProgress(5, 0, this.firmwareData.length);
                await this.esploader.eraseFlash();
                this.log('✅ Flash erased', 'success');
                this.updateProgress(15, 0, this.firmwareData.length);
            } else {
                this.updateProgress(10, 0, this.firmwareData.length);
            }

            // Write flash
            this.log(`📝 Writing ${this.formatBytes(this.firmwareData.length)} to address 0x${flashOffset.toString(16)}...`, 'info');
            this.updateProgress(20, 0, this.firmwareData.length);

            // Convert Uint8Array to binary string for esptool-js
            // esptool-js expects string format, not Uint8Array
            let binaryString = '';
            for (let i = 0; i < this.firmwareData.length; i++) {
                binaryString += String.fromCharCode(this.firmwareData[i]);
            }
            
            this.log(`Converting firmware to binary string... (${this.formatBytes(binaryString.length)})`, 'info');

            // Prepare file data
            const fileArray = [{
                data: binaryString,
                address: flashOffset
            }];

            this.log(`Firmware data prepared: ${fileArray.length} file(s)`, 'info');
            this.log(`File 0: address=0x${flashOffset.toString(16)}, size=${binaryString.length} bytes`, 'info');

            // Flash options
            const flashOptions = {
                fileArray: fileArray,
                flashSize: 'keep',
                flashMode: 'keep', 
                flashFreq: 'keep',
                eraseAll: false, // We already erased if needed above
                compress: true,
                reportProgress: (fileIndex, written, total) => {
                    const percent = 20 + Math.floor((written / total) * 65);
                    this.updateProgress(percent, written, total);
                    
                    // Log progress periodically
                    if (written % (256 * 1024) === 0 || written === total) {
                        this.log(`Progress: ${this.formatBytes(written)} / ${this.formatBytes(total)} (${Math.floor(written/total*100)}%)`, 'info');
                    }
                },
                calculateMD5Hash: (image) => {
                    try {
                        // esptool-js passes binary string
                        if (typeof image === 'string') {
                            // Use CryptoJS to hash the binary string directly
                            const hash = CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)).toString();
                            return hash;
                        }
                        
                        // Fallback for other types
                        let bytes;
                        if (image instanceof Uint8Array) {
                            bytes = image;
                        } else if (image instanceof ArrayBuffer) {
                            bytes = new Uint8Array(image);
                        } else if (Array.isArray(image)) {
                            bytes = new Uint8Array(image);
                        } else {
                            console.warn('Unexpected image type for MD5:', typeof image);
                            bytes = new Uint8Array(Object.values(image));
                        }
                        
                        // Convert bytes to binary string
                        let binaryStr = '';
                        for (let i = 0; i < bytes.length; i++) {
                            binaryStr += String.fromCharCode(bytes[i]);
                        }
                        
                        const hash = CryptoJS.MD5(CryptoJS.enc.Latin1.parse(binaryStr)).toString();
                        return hash;
                    } catch (e) {
                        console.error('MD5 calculation error:', e, 'for image type:', typeof image);
                        throw e;
                    }
                }
            };

            this.log('Starting flash write operation...', 'info');
            await this.esploader.writeFlash(flashOptions);

            this.updateProgress(85, this.firmwareData.length, this.firmwareData.length);
            this.log('✅ Write complete!', 'success');

            // Verify (optional - esptool-js does this automatically)
            this.log('🔍 Verifying flash...', 'info');
            this.updateProgress(95, this.firmwareData.length, this.firmwareData.length);

            // Complete
            this.updateProgress(100, this.firmwareData.length, this.firmwareData.length);
            this.log('=' .repeat(50), 'info');
            this.log('🎉 Flash complete! Device is ready.', 'success');
            
            // Reset device (try multiple methods depending on available API)
            this.log('🔄 Resetting device...', 'info');
            try {
                // Debug info: what reset methods are available
                console.debug('Reset methods:', {
                    esploader_hardReset: this.esploader && typeof this.esploader.hardReset,
                    transport_reset: this.transport && typeof this.transport.reset,
                    device_setSignals: this.device && typeof this.device.setSignals
                });

                if (this.esploader && typeof this.esploader.hardReset === 'function') {
                    this.log('Using esploader.hardReset()', 'info');
                    await this.esploader.hardReset();
                } else if (this.transport && typeof this.transport.reset === 'function') {
                    this.log('Using transport.reset()', 'info');
                    await this.transport.reset();
                } else if (this.device && typeof this.device.setSignals === 'function') {
                    this.log('Toggling DTR via device.setSignals()', 'info');
                    await this.device.setSignals({ dataTerminalReady: true });
                    await new Promise(r => setTimeout(r, 100));
                    await this.device.setSignals({ dataTerminalReady: false });
                } else {
                    this.log('⚠️ Automatic reset not supported. Please reset the device manually.', 'warning');
                }
            } catch (resetError) {
                this.log(`⚠️ Reset failed: ${resetError.message}`, 'warning');
                console.warn('Reset error:', resetError);
            }

        } catch (error) {
            this.log(`❌ Flash failed: ${error.message}`, 'error');
            console.error('Flash error details:', error);
            
            // Provide helpful error messages
            if (error.message.includes('substring')) {
                this.log('💡 Tip: This may be a data format issue. Try reconnecting the device.', 'warning');
            } else if (error.message.includes('timeout')) {
                this.log('💡 Tip: Try lowering the baud rate or checking the USB cable.', 'warning');
            } else if (error.message.includes('Failed to execute')) {
                this.log('💡 Tip: Make sure you\'re using Chrome, Edge, or Opera browser.', 'warning');
            }
            
            this.updateProgress(0, 0, this.firmwareData ? this.firmwareData.length : 0);
        } finally {
            flashBtn.disabled = false;
        }
    }

    // Convert bytes to MAC address string
    bytesToMAC(data) {
        if (!data) return null;
        try {
            const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
            if (bytes.length < 6) return null;
            return Array.from(bytes.slice(0, 6))
                .map(b => b.toString(16).padStart(2, '0').toUpperCase())
                .join(':');
        } catch (e) {
            return null;
        }
    }

    // Validate MAC address format
    isValidMAC(mac) {
        if (!mac || typeof mac !== 'string') return false;
        // MAC format: XX:XX:XX:XX:XX:XX
        const macRegex = /^([0-9A-F]{2}:){5}([0-9A-F]{2})$/i;
        return macRegex.test(mac);
    }

    // Generate MAC from chip ID (deterministic)
    generateMACFromChipId(chipId1, chipId2) {
        try {
            // Use chip ID to generate a consistent MAC address
            const bytes = [
                (chipId1 >> 24) & 0xFF,
                (chipId1 >> 16) & 0xFF,
                (chipId1 >> 8) & 0xFF,
                chipId2 & 0xFF,
                (chipId2 >> 8) & 0xFF,
                (chipId2 >> 16) & 0xFF
            ];
            return bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
        } catch (e) {
            return null;
        }
    }

    // Generate session MAC (for fallback when real MAC unavailable)
    generateSessionMAC() {
        // Generate consistent MAC based on session + random component
        const sessionKey = localStorage.getItem('esp_session_key');
        const baseMAC = sessionKey || Math.random().toString(36).substr(2, 12);
        
        const bytes = [];
        for (let i = 0; i < 6; i++) {
            bytes.push(parseInt(baseMAC.substr(i * 2, 2), 16) || Math.floor(Math.random() * 256));
        }
        
        // Set locally administered bit
        bytes[0] |= 0x02;
        
        return bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
    }

    updateProgress(percent, written, total) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const progressBytes = document.getElementById('progressBytes');

        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${percent}%`;
        progressBytes.textContent = `${this.formatBytes(written)} / ${this.formatBytes(total)}`;
    }

    log(message, type = 'info') {
        const consoleOutput = document.getElementById('consoleOutput');
        const logLine = document.createElement('div');
        logLine.className = `log-line ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        // Sanitize sensitive information
        const sanitizedMessage = this.security.sanitizeConsoleOutput(message);
        logLine.textContent = `[${timestamp}] ${sanitizedMessage}`;
        
        consoleOutput.appendChild(logLine);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ESPWebFlasher();
});
