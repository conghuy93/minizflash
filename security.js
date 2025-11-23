// Security middleware for firmware protection
class SecurityManager {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.attemptCount = 0;
        this.maxAttempts = 5;
        this.lockoutTime = 300000; // 5 minutes
        this.lastAttempt = 0;
        this.trustedOrigins = ['minizjp.com', 'localhost'];
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
