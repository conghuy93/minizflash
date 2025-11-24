// Quick test of encryption system
import SecurityManager from './security.js';
import LicenseManager from './license.js';

console.log('🧪 Testing Firmware URL Encryption System\n');

const security = new SecurityManager();

try {
    // Test 1: Get encrypted DB
    console.log('📦 Test 1: Creating Encrypted Firmware DB');
    const encryptedDB = security.getEncryptedFirmwareDB();
    console.log(`✅ Created ${Object.keys(encryptedDB).length} encrypted URLs\n`);

    // Test 2: Decrypt and verify each firmware
    console.log('🔓 Test 2: Decrypting and Verifying URLs');
    const expectedURLs = [
        'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware1.bin',
        'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware2.bin',
        'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware3.bin',
        'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware4.bin',
        'https://raw.githubusercontent.com/conghuy93/minizflash/main/firmware5.bin'
    ];

    for (let i = 1; i <= 5; i++) {
        const encrypted = encryptedDB[i];
        const decrypted = security.decryptURL(encrypted);
        const expected = expectedURLs[i - 1];
        
        if (decrypted === expected) {
            console.log(`✅ Firmware ${i}: URLs match`);
            console.log(`   Expected: ${expected}`);
            console.log(`   Got:      ${decrypted}`);
        } else {
            console.error(`❌ Firmware ${i}: URL MISMATCH!`);
            console.error(`   Expected: ${expected}`);
            console.error(`   Got:      ${decrypted}`);
        }
    }

    console.log('\n✅ All tests passed!');

} catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
}
