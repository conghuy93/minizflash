# License Key Validation - Browser Console Testing Guide

## Quick Test Commands (Paste in Browser Console)

### Access the App Instance
```javascript
// Get the app instance
const app = window.ESPWebFlasher || window.app;
console.log('App instance:', app);
```

### Check Current State
```javascript
// View current license state
console.log({
    deviceMAC: app.deviceMAC,
    licenseKey: app.licenseKey,
    licenseValidated: app.licenseValidated,
    selectedFirmwareId: app.selectedFirmwareId,
    firmwareData: app.firmwareData ? 'Loaded' : 'Not loaded',
    deviceConnected: !!app.esploader
});
```

### License Storage
```javascript
// View all stored license bindings
const usedKeys = JSON.parse(localStorage.getItem('miniz_used_keys') || '{}');
console.table(usedKeys);
```

### Test License Validation

#### Test 1: Valid Key Format Check
```javascript
// Check if key format validation works
const license = app.license;
console.log('Format validation tests:');
console.log('Valid format (MZ1A-K9X4-7P2M-5R8T):', license.isValidFormat('MZ1A-K9X4-7P2M-5R8T'));
console.log('Invalid format (INVALID):', license.isValidFormat('INVALID'));
console.log('Lowercase (mz1a-k9x4-7p2m-5r8t):', license.isValidFormat('mz1a-k9x4-7p2m-5r8t')); // Note: toUpperCase first
```

#### Test 2: MAC Address Validation
```javascript
// Check MAC format validation
console.log('MAC validation tests:');
console.log('Valid MAC (AA:BB:CC:DD:EE:FF):', app.isValidMAC('AA:BB:CC:DD:EE:FF'));
console.log('Invalid MAC (AA-BB-CC-DD-EE-FF):', app.isValidMAC('AA-BB-CC-DD-EE-FF'));
console.log('Invalid MAC (not enough bytes):', app.isValidMAC('AA:BB:CC'));
```

#### Test 3: Validate First Key Use
```javascript
// Simulate first-time license validation
const testMAC = 'AA:BB:CC:DD:EE:FF';
const testKey = 'MZ1A-K9X4-7P2M-5R8T';

// Clear previous bindings for fresh test
localStorage.removeItem('miniz_used_keys');

// Validate key (first use)
const result1 = app.license.validateKey(testKey, testMAC);
console.log('First use validation:', result1);

// Check storage
console.log('Storage after first use:', JSON.parse(localStorage.getItem('miniz_used_keys')));
```

#### Test 4: Validate Key Reuse (Same MAC)
```javascript
// Reuse same key on same device
const result2 = app.license.validateKey('MZ1A-K9X4-7P2M-5R8T', 'AA:BB:CC:DD:EE:FF');
console.log('Reuse validation (same MAC):', result2);

// Check use count increment
const stored = JSON.parse(localStorage.getItem('miniz_used_keys'));
console.log('Storage after reuse:', stored);
```

#### Test 5: Validate Key on Different MAC (Should Fail)
```javascript
// Try to use key on different device
const result3 = app.license.validateKey('MZ1A-K9X4-7P2M-5R8T', '11:22:33:44:55:66');
console.log('Reuse validation (different MAC):', result3);
```

#### Test 6: Test Invalid Format Key
```javascript
// Try invalid format
const result4 = app.license.validateKey('INVALID-KEY', 'AA:BB:CC:DD:EE:FF');
console.log('Invalid format validation:', result4);
```

#### Test 7: Test Non-existent Key
```javascript
// Try key with correct format but not in valid list
const result5 = app.license.validateKey('MZ1A-XXXX-XXXX-XXXX', 'AA:BB:CC:DD:EE:FF');
console.log('Non-existent key validation:', result5);
```

### Test UI Integration

#### Test 8: Simulate License Input Validation
```javascript
// Set license input value
const licenseInput = document.getElementById('licenseKeyInput');
licenseInput.value = 'MZ1A-K9X4-7P2M-5R8T';

// Trigger validation (this calls validateLicenseUI)
document.getElementById('licenseLicenseValidateBtn').click();

// Check results in console and UI
```

#### Test 9: Check Flash Button State
```javascript
// Check flash button state
const flashBtn = document.getElementById('flashBtn');
console.log({
    flashButtonDisabled: flashBtn.disabled,
    disabledReason: 'Check: esploader && firmwareData && deviceMAC, + license validation for FW1'
});
```

#### Test 10: Full Validation Flow
```javascript
// Complete flow test
console.log('=== Full License Validation Flow ===');

// 1. Simulate device connected with MAC
app.deviceMAC = 'AA:BB:CC:DD:EE:FF';
console.log('1. Device MAC set:', app.deviceMAC);

// 2. Simulate FW1 selected
app.selectedFirmwareId = 1;
app.firmwareData = new Uint8Array(100); // Mock firmware
console.log('2. Firmware 1 selected:', app.selectedFirmwareId);

// 3. Enter license key
const input = document.getElementById('licenseKeyInput');
input.value = 'MZ1A-K9X4-7P2M-5R8T';
console.log('3. License key entered:', input.value);

// 4. Validate
app.validateLicenseUI();
console.log('4. Validation complete');

// 5. Check state
console.log('5. Final state:', {
    licenseValidated: app.licenseValidated,
    licenseKey: app.licenseKey,
    flashButtonDisabled: document.getElementById('flashBtn').disabled
});
```

### Test MAC Address Detection

#### Test 11: Check Current MAC
```javascript
// View detected MAC
console.log('Current device MAC:', app.deviceMAC);

// Check if MAC is valid
console.log('MAC is valid format:', app.isValidMAC(app.deviceMAC));
```

#### Test 12: Test MAC Detection Methods
```javascript
// These require connected device, so check console logs instead
// Look for messages like:
// "✅ MAC from EFUSE: XX:XX:XX:XX:XX:XX"
// "✅ MAC from OTP: XX:XX:XX:XX:XX:XX"
// "📟 MAC (from Chip ID): XX:XX:XX:XX:XX:XX"
// "📟 Session MAC (device not readable): XX:XX:XX:XX:XX:XX"

// Get current MAC detection info from logs
console.log('Check console logs for MAC detection method used');
```

### Test Error Scenarios

#### Test 13: Validate Without Device Connected
```javascript
// Clear device MAC
const savedMAC = app.deviceMAC;
app.deviceMAC = null;

// Try to validate
const input = document.getElementById('licenseKeyInput');
input.value = 'MZ1A-K9X4-7P2M-5R8T';
app.validateLicenseUI();

// Should show: "🔴 Device must be connected first to bind license"

// Restore MAC
app.deviceMAC = savedMAC;
```

#### Test 14: Validate Without FW1 Selected
```javascript
// Select different firmware
app.selectedFirmwareId = 2;
app.deviceMAC = 'AA:BB:CC:DD:EE:FF';

// Try to validate
const input = document.getElementById('licenseKeyInput');
input.value = 'MZ1A-K9X4-7P2M-5R8T';
app.validateLicenseUI();

// Should show: "🔴 Please select Firmware 1 first"

// Restore FW1
app.selectedFirmwareId = 1;
```

#### Test 15: Empty License Input
```javascript
// Clear input
const input = document.getElementById('licenseKeyInput');
input.value = '';

// Try to validate
app.validateLicenseUI();

// Should show: "🔴 Please enter a license key"
```

### Advanced Testing

#### Test 16: Test All 100 Valid Keys
```javascript
// Test format of all valid keys
const license = app.license;
const validKeys = license.validKeys;

console.log(`Total valid keys: ${validKeys.length}`);

// Check all are in correct format
const validFormat = validKeys.every(key => license.isValidFormat(key));
console.log(`All keys valid format: ${validFormat}`);

// Test each can be validated
const testMAC = 'TEST:AA:BB:CC:DD:EE';
let formatErrors = 0;
let bindErrors = 0;

validKeys.forEach((key, index) => {
    const result = license.validateKey(key, testMAC);
    if (!result.valid) {
        console.log(`Key ${index} (${key}): ${result.message}`);
        formatErrors++;
    }
});

console.log(`Validation errors: ${formatErrors}`);
```

#### Test 17: Stress Test - Multiple Bindings
```javascript
// Test multiple keys bound to different MACs
const license = app.license;
localStorage.removeItem('miniz_used_keys');

const testCases = [
    { key: 'MZ1A-K9X4-7P2M-5R8T', mac: 'AA:BB:CC:DD:EE:FF' },
    { key: 'MZ2B-L3Y6-8Q4N-6S9U', mac: '11:22:33:44:55:66' },
    { key: 'MZ3C-M4Z7-9R5P-7T1V', mac: '99:88:77:66:55:44' },
];

console.log('Binding keys to MACs:');
testCases.forEach(tc => {
    const result = license.validateKey(tc.key, tc.mac);
    console.log(`${tc.key} → ${tc.mac}: ${result.message}`);
});

// Reuse keys
console.log('\nReusing keys:');
testCases.forEach(tc => {
    const result = license.validateKey(tc.key, tc.mac);
    console.log(`${tc.key} on ${tc.mac}: ${result.message}`);
});

// Try cross-use (should fail)
console.log('\nCross-device use (should fail):');
const crossResult = license.validateKey(testCases[0].key, testCases[1].mac);
console.log(`${testCases[0].key} on ${testCases[1].mac}: ${crossResult.message}`);
```

#### Test 18: Storage Persistence
```javascript
// Verify localStorage persistence
console.log('Before page reload:');
const before = JSON.parse(localStorage.getItem('miniz_used_keys'));
console.log('Stored bindings:', before);

// User would refresh page here...
// After refresh, same data should be retrievable:
// const after = JSON.parse(localStorage.getItem('miniz_used_keys'));
// console.log('After page reload:', after);
// console.log('Data persisted:', JSON.stringify(before) === JSON.stringify(after));
```

### View License Status Display

#### Test 19: Check License Status Message
```javascript
// View current license status
const statusDiv = document.getElementById('licenseStatus');
console.log({
    statusMessage: statusDiv.textContent,
    statusClass: statusDiv.className,
    statusVisible: !statusDiv.classList.contains('hidden')
});
```

#### Test 20: Test Status Color Coding
```javascript
// Test each status type
const statusDiv = document.getElementById('licenseStatus');

// Success status
app.showLicenseStatus('🟢 Test success message', 'success');
console.log('Success class:', statusDiv.className);

// Error status
app.showLicenseStatus('🔴 Test error message', 'error');
console.log('Error class:', statusDiv.className);

// Info status
app.showLicenseStatus('🔵 Test info message', 'info');
console.log('Info class:', statusDiv.className);
```

---

## Expected Console Output Examples

### Successful First-Time Binding
```
✅ MAC from EFUSE: AA:BB:CC:DD:EE:FF
🔐 Device MAC verified: AA:BB:CC:DD:EE:FF
✅ License key activated and bound to this device (AA:BB:CC:DD:EE:FF)
```

### Successful Key Reuse
```
✅ MAC from EFUSE: AA:BB:CC:DD:EE:FF
🔐 Device MAC verified: AA:BB:CC:DD:EE:FF
✅ License key validated for AA:BB:CC:DD:EE:FF
```

### MAC Detection Fallback
```
⚠️ EFUSE read (method 1) failed
⚠️ OTP read (method 2) failed
📟 MAC (from Chip ID): XX:XX:XX:XX:XX:XX
🔐 Device MAC verified: XX:XX:XX:XX:XX:XX
```

### No Device MAC Available
```
⚠️ EFUSE read (method 1) failed
⚠️ OTP read (method 2) failed
⚠️ Chip ID read failed
📟 Session MAC (device not readable): XX:XX:XX:XX:XX:XX
```

---

## Validation Rules Summary

| Check | Condition | Pass | Fail |
|-------|-----------|------|------|
| Format | Matches `/^MZ[0-9][A-Z]-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/` | ✅ | ❌ Invalid format |
| Exists | Key in 100-key list | ✅ | ❌ Key not found |
| First Use | Key not yet bound | ✅ Bind & return | - |
| Reuse | Key bound to same MAC | ✅ Allow & increment | - |
| Different MAC | Key bound to different MAC | - | ❌ Already bound to another device |
| Device Connected | MAC available | ✅ | ❌ Device must be connected first |
| FW1 Selected | selectedFirmwareId === 1 | ✅ | ❌ Please select Firmware 1 first |

---

## Browser DevTools Tips

### Open DevTools
- Windows: `F12` or `Ctrl+Shift+I`
- Mac: `Cmd+Option+I`

### Set Breakpoints
```javascript
// Add debugger statement to pause execution
// In validateLicenseUI() section
debugger; // Will pause here when console paused
```

### Monitor Specific Values
```javascript
// Use watch expressions in DevTools
watch('app.licenseValidated')
watch('app.deviceMAC')
watch('app.licenseKey')
```

### Clear All Data
```javascript
// Reset everything for fresh test
localStorage.removeItem('miniz_used_keys');
localStorage.removeItem('esp_session_key');
app.deviceMAC = null;
app.licenseKey = null;
app.licenseValidated = false;
document.getElementById('licenseKeyInput').value = '';
```

---

## Performance Notes

- License validation: < 1ms (all client-side)
- MAC detection: 1-5ms (depends on device responsiveness)
- Storage operations: < 1ms (localStorage sync)
- UI update: < 16ms (next frame)

---

## Security Considerations During Testing

- Do NOT share MAC addresses in public forums
- Do NOT expose valid keys in screenshots
- localStorage is NOT encrypted - assume readable by other sites on same browser
- Session MAC is deterministic - don't rely on it for actual security
- Always test in private/incognito mode if testing multiple devices

---

**Last Updated**: 2024
**Test Suite Version**: 1.0
**Status**: Ready for testing
