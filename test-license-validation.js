#!/usr/bin/env node

/**
 * License Validation System - Local Testing Script
 * Tests the LicenseManager logic without browser/device dependencies
 * 
 * Usage: node test-license-validation.js
 */

// Mock localStorage for testing
const mockLocalStorage = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value; },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; },
        get _data() { return store; }
    };
})();

// Simple LicenseManager implementation for testing
class LicenseManager {
    constructor() {
        this.storageKey = 'miniz_licenses';
        this.usedKeysKey = 'miniz_used_keys';
        
        // First 10 keys for testing (subset of 100)
        this.validKeys = [
            'MZ1A-K9X4-7P2M-5R8T', 'MZ2B-L3Y6-8Q4N-6S9U', 'MZ3C-M4Z7-9R5P-7T1V',
            'MZ4D-N5A8-1S6Q-8U2W', 'MZ5E-P6B9-2T7R-9V3X', 'MZ6F-Q7C1-3U8S-1W4Y',
            'MZ7G-R8D2-4V9T-2X5Z', 'MZ8H-S9E3-5W1U-3Y6A', 'MZ9I-T1F4-6X2V-4Z7B',
            'MZ1J-U2G5-7Y3W-5A8C'
        ];
    }

    getUsedKeys() {
        const stored = mockLocalStorage.getItem(this.usedKeysKey);
        return stored ? JSON.parse(stored) : {};
    }

    saveUsedKeys(usedKeys) {
        mockLocalStorage.setItem(this.usedKeysKey, JSON.stringify(usedKeys));
    }

    isValidFormat(key) {
        const pattern = /^MZ[0-9][A-Z]-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
        return pattern.test(key);
    }

    isValidKey(key) {
        return this.validKeys.includes(key.toUpperCase());
    }

    getBoundMAC(key) {
        const usedKeys = this.getUsedKeys();
        return usedKeys[key] || null;
    }

    bindKeyToMAC(key, macAddress) {
        const usedKeys = this.getUsedKeys();
        usedKeys[key] = {
            mac: macAddress,
            firstUsed: new Date().toISOString(),
            useCount: 1
        };
        this.saveUsedKeys(usedKeys);
    }

    incrementUseCount(key) {
        const usedKeys = this.getUsedKeys();
        if (usedKeys[key]) {
            usedKeys[key].useCount++;
            usedKeys[key].lastUsed = new Date().toISOString();
            this.saveUsedKeys(usedKeys);
        }
    }

    validateKey(key, macAddress) {
        key = key.toUpperCase().trim();

        if (!this.isValidFormat(key)) {
            return { valid: false, message: 'Invalid key format' };
        }

        if (!this.isValidKey(key)) {
            return { valid: false, message: 'Key not found or invalid' };
        }

        const boundData = this.getBoundMAC(key);
        
        if (!boundData) {
            this.bindKeyToMAC(key, macAddress);
            return { 
                valid: true, 
                message: 'Key activated for this device',
                firstUse: true,
                useCount: 1
            };
        }

        if (boundData.mac === macAddress) {
            this.incrementUseCount(key);
            return { 
                valid: true, 
                message: `Key verified (Used ${boundData.useCount + 1} times)`,
                firstUse: false,
                useCount: boundData.useCount + 1
            };
        } else {
            return { 
                valid: false, 
                message: 'Key already bound to another device'
            };
        }
    }
}

// Test Suite
const testResults = [];

function test(name, fn) {
    try {
        fn();
        testResults.push({ name, status: '✅ PASS' });
        console.log(`✅ ${name}`);
    } catch (e) {
        testResults.push({ name, status: `❌ FAIL: ${e.message}` });
        console.log(`❌ ${name}`);
        console.log(`   Error: ${e.message}`);
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message} - expected: ${expected}, got: ${actual}`);
    }
}

function assertTrue(value, message) {
    if (!value) {
        throw new Error(message);
    }
}

function assertFalse(value, message) {
    if (value) {
        throw new Error(message);
    }
}

// ============================================================================
// Test Suite
// ============================================================================

console.log('🧪 License Validation System - Test Suite\n');

// Test 1: Format Validation
test('Format validation - valid key', () => {
    const license = new LicenseManager();
    assertTrue(license.isValidFormat('MZ1A-K9X4-7P2M-5R8T'), 'Valid key format not accepted');
});

test('Format validation - invalid format (no hyphens)', () => {
    const license = new LicenseManager();
    assertFalse(license.isValidFormat('MZ1AK9X47P2M5R8T'), 'Invalid format accepted');
});

test('Format validation - invalid format (lowercase)', () => {
    const license = new LicenseManager();
    assertFalse(license.isValidFormat('mz1a-k9x4-7p2m-5r8t'), 'Lowercase key accepted (should fail format check before toUpperCase)');
});

test('Format validation - invalid format (wrong pattern)', () => {
    const license = new LicenseManager();
    assertFalse(license.isValidFormat('XX1A-K9X4-7P2M-5R8T'), 'Wrong prefix accepted');
});

// Test 2: Key Existence Check
test('Key check - key exists', () => {
    const license = new LicenseManager();
    assertTrue(license.isValidKey('MZ1A-K9X4-7P2M-5R8T'), 'Valid key not found');
});

test('Key check - key not exists', () => {
    const license = new LicenseManager();
    assertFalse(license.isValidKey('MZ1A-XXXX-XXXX-XXXX'), 'Invalid key found');
});

// Test 3: First-time binding
test('First use - binds key to MAC', () => {
    mockLocalStorage.clear();
    const license = new LicenseManager();
    const result = license.validateKey('MZ1A-K9X4-7P2M-5R8T', 'AA:BB:CC:DD:EE:FF');
    
    assertTrue(result.valid, 'Validation should succeed');
    assertTrue(result.firstUse, 'Should be marked as first use');
    assertEqual(result.useCount, 1, 'Use count should be 1');
    
    // Verify binding stored
    const bound = license.getBoundMAC('MZ1A-K9X4-7P2M-5R8T');
    assertEqual(bound.mac, 'AA:BB:CC:DD:EE:FF', 'MAC not bound correctly');
    assertEqual(bound.useCount, 1, 'Use count not stored correctly');
});

// Test 4: Key reuse (same MAC)
test('Reuse - same MAC, increments count', () => {
    mockLocalStorage.clear();
    const license = new LicenseManager();
    
    // First use
    license.validateKey('MZ1A-K9X4-7P2M-5R8T', 'AA:BB:CC:DD:EE:FF');
    
    // Reuse
    const result = license.validateKey('MZ1A-K9X4-7P2M-5R8T', 'AA:BB:CC:DD:EE:FF');
    
    assertTrue(result.valid, 'Reuse should be valid');
    assertFalse(result.firstUse, 'Should not be marked as first use');
    assertEqual(result.useCount, 2, 'Use count should be 2');
});

// Test 5: Key used on different MAC
test('Different MAC - rejects key', () => {
    mockLocalStorage.clear();
    const license = new LicenseManager();
    
    // First use on device 1
    license.validateKey('MZ1A-K9X4-7P2M-5R8T', 'AA:BB:CC:DD:EE:FF');
    
    // Try to use on device 2
    const result = license.validateKey('MZ1A-K9X4-7P2M-5R8T', '11:22:33:44:55:66');
    
    assertFalse(result.valid, 'Key should be rejected for different MAC');
    assertEqual(result.message, 'Key already bound to another device', 'Wrong error message');
});

// Test 6: Invalid format
test('Invalid format - rejected', () => {
    mockLocalStorage.clear();
    const license = new LicenseManager();
    
    const result = license.validateKey('INVALID-KEY-123', 'AA:BB:CC:DD:EE:FF');
    
    assertFalse(result.valid, 'Invalid format should be rejected');
    assertEqual(result.message, 'Invalid key format', 'Wrong error message');
});

// Test 7: Non-existent key
test('Non-existent key - rejected', () => {
    mockLocalStorage.clear();
    const license = new LicenseManager();
    
    const result = license.validateKey('MZ1A-XXXX-XXXX-XXXX', 'AA:BB:CC:DD:EE:FF');
    
    assertFalse(result.valid, 'Non-existent key should be rejected');
    assertEqual(result.message, 'Key not found or invalid', 'Wrong error message');
});

// Test 8: Case insensitivity
test('Case insensitivity - accepts lowercase', () => {
    mockLocalStorage.clear();
    const license = new LicenseManager();
    
    const result = license.validateKey('mz1a-k9x4-7p2m-5r8t', 'AA:BB:CC:DD:EE:FF');
    
    assertTrue(result.valid, 'Lowercase key should be accepted and converted');
    assertTrue(result.firstUse, 'Should bind correctly');
});

// Test 9: Whitespace trimming
test('Whitespace trimming - accepts padded key', () => {
    mockLocalStorage.clear();
    const license = new LicenseManager();
    
    const result = license.validateKey('  MZ1A-K9X4-7P2M-5R8T  ', 'AA:BB:CC:DD:EE:FF');
    
    assertTrue(result.valid, 'Padded key should be trimmed and accepted');
});

// Test 10: Multiple keys, multiple devices
test('Multiple keys - independent binding', () => {
    mockLocalStorage.clear();
    const license = new LicenseManager();
    
    // Key 1 on Device A
    license.validateKey('MZ1A-K9X4-7P2M-5R8T', 'AA:BB:CC:DD:EE:FF');
    
    // Key 2 on Device B
    license.validateKey('MZ2B-L3Y6-8Q4N-6S9U', '11:22:33:44:55:66');
    
    // Reuse Key 1 on Device A (should work)
    const result1 = license.validateKey('MZ1A-K9X4-7P2M-5R8T', 'AA:BB:CC:DD:EE:FF');
    assertTrue(result1.valid, 'Key 1 should work on Device A');
    
    // Try Key 1 on Device B (should fail)
    const result2 = license.validateKey('MZ1A-K9X4-7P2M-5R8T', '11:22:33:44:55:66');
    assertFalse(result2.valid, 'Key 1 should not work on Device B');
    
    // Reuse Key 2 on Device B (should work)
    const result3 = license.validateKey('MZ2B-L3Y6-8Q4N-6S9U', '11:22:33:44:55:66');
    assertTrue(result3.valid, 'Key 2 should work on Device B');
});

// ============================================================================
// Results Summary
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('📊 Test Results Summary\n');

const passed = testResults.filter(r => r.status === '✅ PASS').length;
const failed = testResults.filter(r => r.status.startsWith('❌')).length;
const total = testResults.length;

console.log(`Total: ${total}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

if (failed > 0) {
    console.log('Failed Tests:');
    testResults.filter(r => r.status.startsWith('❌')).forEach(r => {
        console.log(`  ${r.status} - ${r.name}`);
    });
}

console.log('='.repeat(60));

// Exit with appropriate code
process.exit(failed > 0 ? 1 : 0);
