// Security middleware for firmware protection
class SecurityManager {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.attemptCount = 0;
        this.maxAttempts = 5;
        this.lockoutTime = 300000; // 5 minutes
        this.lastAttempt = 0;
        this.trustedOrigins = ['minizjp.com', 'localhost'];
        
        // URL encryption system
        this.xorKey = this.generateXORKey();
        this.setupAntiDebug();
    }
    
    // Generate dynamic XOR key based on browser fingerprint
    generateXORKey() {
        const nav = navigator;
        const fingerprint = [
            nav.userAgent,
            nav.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            nav.hardwareConcurrency || 4
        ].join('|');
        
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            hash = ((hash << 5) - hash) + fingerprint.charCodeAt(i);
            hash = hash & hash;
        }
        
        return Math.abs(hash) % 256;
    }
    
    // XOR encryption/decryption
    xorCipher(str, key) {
        let result = '';
        for (let i = 0; i < str.length; i++) {
            result += String.fromCharCode(str.charCodeAt(i) ^ (key + i) % 256);
        }
        return result;
    }
    
    // Custom base64 with shuffled alphabet
    customBase64Encode(str) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const shuffled = 'mNzQ8RxL2KpYvT5wHcU7rJeB9GfX4qaW3isDkEg6AoICt1PhVuOFljS0Mynb';
        
        let b64 = btoa(str);
        let result = '';
        for (let i = 0; i < b64.length; i++) {
            const idx = alphabet.indexOf(b64[i]);
            result += idx !== -1 ? shuffled[idx] : b64[i];
        }
        return result;
    }
    
    customBase64Decode(str) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const shuffled = 'mNzQ8RxL2KpYvT5wHcU7rJeB9GfX4qaW3isDkEg6AoICt1PhVuOFljS0Mynb';
        
        let result = '';
        for (let i = 0; i < str.length; i++) {
            const idx = shuffled.indexOf(str[i]);
            result += idx !== -1 ? alphabet[idx] : str[i];
        }
        return atob(result);
    }
    
    // Multi-layer URL encryption
    encryptURL(url) {
        // Layer 1: XOR encryption
        const xored = this.xorCipher(url, this.xorKey);
        
        // Layer 2: Custom base64
        const encoded = this.customBase64Encode(xored);
        
        // Layer 3: Add noise at predictable positions
        let noisy = '';
        for (let i = 0; i < encoded.length; i++) {
            noisy += encoded[i];
            if ((i + 1) % 7 === 0) {
                noisy += String.fromCharCode(65 + Math.floor(Math.random() * 26));
            }
        }
        
        return noisy;
    }
    
    // Multi-layer URL decryption
    decryptURL(encrypted) {
        // Layer 3: Remove noise
        let cleaned = '';
        for (let i = 0; i < encrypted.length; i++) {
            if ((i + 1) % 8 !== 0) {
                cleaned += encrypted[i];
            }
        }
        
        // Layer 2: Custom base64 decode
        const decoded = this.customBase64Decode(cleaned);
        
        // Layer 1: XOR decryption
        const url = this.xorCipher(decoded, this.xorKey);
        
        return url;
    }
    
    // Get encrypted firmware URLs
    getEncryptedFirmwareDB() {
        const urls = [
            'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware1.bin',
            'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware2.bin',
            'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware3.bin',
            'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware4.bin',
            'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware5.bin'
        ];

        const encrypted = {};
        urls.forEach((url, idx) => {
            encrypted[idx + 1] = this.encryptURL(url);
        });

        return encrypted;
    }
    
    // Anti-debugging setup
    setupAntiDebug() {
        // Detect DevTools
        let devtoolsOpen = false;
        const detectDevTools = () => {
            const threshold = 160;
            if (window.outerWidth - window.innerWidth > threshold || 
                window.outerHeight - window.innerHeight > threshold) {
                devtoolsOpen = true;
            }
        };
        
        window.addEventListener('resize', detectDevTools);
        detectDevTools();

        // Obfuscate sensitive console output
        if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            const originalLog = console.log;
            console.log = function(...args) {
                if (!devtoolsOpen) {
                    const sanitized = args.map(arg => 
                        typeof arg === 'string' ? arg.replace(/https?:\/\/[^\s]+/g, '[URL]') : arg
                    );
                    originalLog.apply(console, sanitized);
                }
            };
        }
    }

    generateSessionId() {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
    }

    checkOrigin() {
        const hostname = window.location.hostname;
        if (!this.trustedOrigins.some(origin => hostname.includes(origin))) {
            return false;
        }
        return true;
    }

    isLocked() {
        if (this.attemptCount >= this.maxAttempts) {
            const timeSinceLast = Date.now() - this.lastAttempt;
            if (timeSinceLast < this.lockoutTime) {
                return true;
            } else {
                this.attemptCount = 0;
            }
        }
        return false;
    }

    recordAttempt() {
        this.attemptCount++;
        this.lastAttempt = Date.now();
    }

    obfuscateUrl(url) {
        // Add random query parameters to obfuscate URL
        const timestamp = Date.now();
        const rand = Math.random().toString(36).substring(7);
        return `${url}?t=${timestamp}&s=${this.sessionId}&r=${rand}`;
    }

    async verifyIntegrity(data, expectedSize) {
        // Basic integrity check
        if (data.length !== expectedSize) {
            return false;
        }
        // Check for valid binary signature (ESP format)
        if (data[0] !== 0xE9 && data[0] !== 0x00) {
            return false;
        }
        return true;
    }

    sanitizeConsoleOutput(message) {
        // Remove sensitive information from console
        return message
            .replace(/https?:\/\/[^\s]+/g, '[URL_HIDDEN]')
            .replace(/\b[A-Fa-f0-9]{32,}\b/g, '[HASH_HIDDEN]');
    }

    preventDevTools() {
        // Detect DevTools (optional - can be removed if too aggressive)
        const threshold = 160;
        setInterval(() => {
            if (window.outerWidth - window.innerWidth > threshold || 
                window.outerHeight - window.innerHeight > threshold) {
                // DevTools detected
                console.clear();
            }
        }, 1000);
    }

    disableRightClick() {
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
    }

    disableCopyPaste() {
        document.addEventListener('copy', (e) => {
            e.preventDefault();
            return false;
        });
        document.addEventListener('cut', (e) => {
            e.preventDefault();
            return false;
        });
    }

    addSecurityHeaders() {
        // These should ideally be set server-side, but we can add meta tags
        const meta1 = document.createElement('meta');
        meta1.httpEquiv = 'Content-Security-Policy';
        meta1.content = "default-src 'self' https://unpkg.com https://cdnjs.cloudflare.com https://raw.githubusercontent.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline';";
        document.head.appendChild(meta1);

        const meta2 = document.createElement('meta');
        meta2.httpEquiv = 'X-Content-Type-Options';
        meta2.content = 'nosniff';
        document.head.appendChild(meta2);
    }
}

export default SecurityManager;
