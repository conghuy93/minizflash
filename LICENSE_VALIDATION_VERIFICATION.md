# License Key Validation System - Verification Report

## System Overview

The license key validation system is fully integrated into the ESP32-S3 web flasher with the following components:

### 1. **Key Components**

#### LicenseManager (web/license.js)
- **100 Pre-generated Keys**: MZ format (MZxA-xxxx-xxxx-xxxx)
- **MAC Binding**: First-use binding, permanent per device
- **Persistence**: localStorage storage for key-MAC bindings
- **Use Counting**: Tracks usage per key

#### Validation Flow (web/app.js)
1. User connects device → MAC address detected (3-method fallback)
2. User selects Firmware 1 → License section appears
3. User enters license key → Format validated
4. System checks binding status and enables flash button

#### MAC Address Detection (3-Method Fallback)
1. **EFUSE Registers** (0x60007044, 0x60007048) - Espressif official spec
2. **OTP Registers** (0x3f41a048, 0x3f41a04c) - Alternative method
3. **Chip ID** (0x60000050, 0x60000054) - Generated from device ID
4. **Session MAC** - Deterministic fallback if all methods fail

---

## Validation Logic Flow

### validateLicenseUI() Method (Lines 414-463)

```
User clicks "✓ Validate" button
    ↓
Is key empty?
    YES → Show "🔴 Please enter a license key" → Return
    NO ↓
Is Firmware 1 selected?
    NO → Show "🔴 Please select Firmware 1 first" → Return
    YES ↓
Is device MAC available?
    NO → Show "🔴 Device must be connected first" → Return
    YES ↓
Is key format valid (regex)?
    NO → Show "🔴 Invalid format: Use MZxA-xxxx-xxxx-xxxx" → Clear input → Return
    YES ↓
Call license.validateKey(key, MAC)
    ↓
Key exists in validKeys list?
    NO → Show "🔴 Key not found or invalid" → Clear input → Return
    YES ↓
Is key already bound?
    NO → Bind to current MAC → Show "🟢 Key activated! Bound to XX:XX:XX:XX:XX:XX"
    YES → Is bound MAC same as current MAC?
        NO → Show "🔴 Key already bound to another device" → Clear input → Return
        YES → Increment use count → Show "🟢 Key valid! Usage: Nx"
    ↓
Set licenseValidated = true, licenseKey = key
Update flash button state
```

---

## Test Scenarios & Expected Behavior

### Scenario 1: Valid Key - First Use (Binding)
**Prerequisites**: Device connected, Firmware 1 selected, key: MZ1A-K9X4-7P2M-5R8T, MAC: AA:BB:CC:DD:EE:FF

**Steps**:
1. Connect device → Console: "✅ MAC from EFUSE: AA:BB:CC:DD:EE:FF"
2. Select Firmware 1 → License section appears
3. Enter key `MZ1A-K9X4-7P2M-5R8T`
4. Click "✓ Validate"

**Expected Results**:
- ✅ License status: "🟢 Key activated! Bound to AA:BB:CC:DD:EE:FF"
- ✅ Console: "✅ License key activated and bound to this device"
- ✅ Flash button: ENABLED
- ✅ localStorage entry created: `miniz_used_keys['MZ1A-K9X4-7P2M-5R8T'] = {mac, firstUsed, useCount: 1}`
- ✅ Can proceed to flash firmware

---

### Scenario 2: Valid Key - Subsequent Use (Reuse Same Device)
**Prerequisites**: Key already bound to AA:BB:CC:DD:EE:FF, device with same MAC connected

**Steps**:
1. Refresh page or reconnect device
2. Connect device → Console: "✅ MAC from EFUSE: AA:BB:CC:DD:EE:FF"
3. Select Firmware 1
4. Enter same key `MZ1A-K9X4-7P2M-5R8T`
5. Click "✓ Validate"

**Expected Results**:
- ✅ License status: "🟢 Key valid! Usage: 2x" (incremented use count)
- ✅ Console: "✅ License key validated for AA:BB:CC:DD:EE:FF"
- ✅ Flash button: ENABLED
- ✅ localStorage updated: `useCount` incremented, `lastUsed` timestamp added
- ✅ Can proceed to flash firmware

---

### Scenario 3: Valid Key - Wrong Device (MAC Mismatch)
**Prerequisites**: Key bound to AA:BB:CC:DD:EE:FF, connecting device with MAC: 11:22:33:44:55:66

**Steps**:
1. Connect different device → Console: "✅ MAC from EFUSE: 11:22:33:44:55:66"
2. Select Firmware 1
3. Enter key `MZ1A-K9X4-7P2M-5R8T` (already bound to different MAC)
4. Click "✓ Validate"

**Expected Results**:
- ❌ License status: "🔴 Key already bound to another device"
- ❌ License input cleared
- ❌ Flash button: DISABLED
- ❌ Console: No success message
- ❌ Flash operation blocked
- ℹ️ User needs a new key for this device

---

### Scenario 4: Invalid Key Format
**Prerequisites**: Device connected, Firmware 1 selected

**Steps**:
1. Connect device
2. Select Firmware 1
3. Enter invalid format key: `INVALID-KEY-123`
4. Click "✓ Validate"

**Expected Results**:
- ❌ License status: "🔴 Invalid format: Use MZxA-xxxx-xxxx-xxxx"
- ❌ License input cleared
- ❌ Flash button: DISABLED
- ℹ️ Regex validation: `/^MZ[0-9][A-Z]-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/`

---

### Scenario 5: Key Not in Valid List
**Prerequisites**: Device connected, Firmware 1 selected, key format valid but not in 100-key list

**Steps**:
1. Connect device
2. Select Firmware 1
3. Enter fake key (correct format): `MZ1A-XXXX-XXXX-XXXX`
4. Click "✓ Validate"

**Expected Results**:
- ❌ License status: "🔴 Key not found or invalid"
- ❌ License input cleared
- ❌ Flash button: DISABLED

---

### Scenario 6: Device Not Connected
**Prerequisites**: No device connected, Firmware 1 selected

**Steps**:
1. Do NOT connect device
2. Select Firmware 1
3. Enter valid key
4. Click "✓ Validate"

**Expected Results**:
- ❌ License status: "🔴 Device must be connected first to bind license"
- ❌ License input preserved (not cleared)
- ❌ Flash button: DISABLED
- ℹ️ User must connect device before license validation

---

### Scenario 7: Firmware Not Selected
**Prerequisites**: Device connected

**Steps**:
1. Connect device
2. Do NOT select Firmware 1 (select FW2-5 instead)
3. Enter valid key
4. Click "✓ Validate"

**Expected Results**:
- ❌ License status: "🔴 Please select Firmware 1 first"
- ❌ License input preserved
- ❌ License section not shown
- ℹ️ Only Firmware 1 requires license

---

### Scenario 8: Empty Key
**Prerequisites**: License section visible

**Steps**:
1. Leave license input empty
2. Click "✓ Validate"

**Expected Results**:
- ❌ License status: "🔴 Please enter a license key"
- ❌ Flash button: DISABLED

---

### Scenario 9: Key Case Insensitivity
**Prerequisites**: Device connected, Firmware 1 selected, key: MZ1A-K9X4-7P2M-5R8T

**Steps**:
1. Connect device
2. Select Firmware 1
3. Enter lowercase/mixed case: `mz1a-k9x4-7p2m-5r8t`
4. Click "✓ Validate"

**Expected Results**:
- ✅ Automatically converted to uppercase
- ✅ License status: "🟢 Key activated! Bound to [MAC]"
- ✅ Flash button: ENABLED
- ✅ localStorage key stored as uppercase

---

### Scenario 10: Flash Button State Management
**Prerequisites**: All components initialized

**Steps**:

#### 10A: FW1 without license
1. Connect device
2. Select Firmware 1
3. Don't validate license
4. Try to click flash button

**Expected Results**:
- ❌ Flash button: DISABLED
- ℹ️ Condition check in updateFlashButtonState() line 429-441:
  ```javascript
  if (this.selectedFirmwareId === 1) {
      flashBtn.disabled = !this.licenseValidated;
  } else {
      flashBtn.disabled = false;
  }
  ```

#### 10B: FW1 with license
1. Connect device
2. Select Firmware 1
3. Validate valid license
4. Try to click flash button

**Expected Results**:
- ✅ Flash button: ENABLED
- ✅ Flash operation allowed

#### 10C: FW2-5 (no license required)
1. Connect device
2. Select FW2, FW3, FW4, or FW5
3. Do NOT validate license

**Expected Results**:
- ✅ Flash button: ENABLED
- ✅ License section: HIDDEN
- ✅ Flash operation allowed without license

---

## MAC Address Detection Verification

### Method 1: EFUSE Registers (Official Espressif API)
**Address**: 0x60007044 (word0), 0x60007048 (word1)
**Byte Extraction**:
```javascript
word0 = [AA, BB, CC, DD] (bytes 0-3)
word1 = [EE, FF, ??, ??] (bytes 4-5)
MAC = AA:BB:CC:DD:EE:FF
```

**Expected Console Output**: `✅ MAC from EFUSE: AA:BB:CC:DD:EE:FF`

---

### Method 2: OTP Fallback
**Address**: 0x3f41a048, 0x3f41a04c
**Used if**: EFUSE read fails
**Expected Console Output**: `✅ MAC from OTP: AA:BB:CC:DD:EE:FF`

---

### Method 3: Chip ID Derivation
**Address**: 0x60000050 (chipId1), 0x60000054 (chipId2)
**Derivation Logic**:
```javascript
bytes = [
    (chipId1 >> 24) & 0xFF,
    (chipId1 >> 16) & 0xFF,
    (chipId1 >> 8) & 0xFF,
    chipId2 & 0xFF,
    (chipId2 >> 8) & 0xFF,
    (chipId2 >> 16) & 0xFF
]
```
**Used if**: EFUSE and OTP both fail
**Expected Console Output**: `📟 MAC (from Chip ID): XX:XX:XX:XX:XX:XX`

---

### Method 4: Session MAC (Last Resort)
**Generation**: Deterministic based on localStorage session key or random
**Used if**: All hardware methods fail
**Expected Console Output**: `📟 Session MAC (device not readable): XX:XX:XX:XX:XX:XX`

---

## Validation Test Checklist

### Code Quality Checks
- [ ] isValidFormat() regex validates MZxA-xxxx-xxxx-xxxx pattern
- [ ] isValidMAC() regex validates XX:XX:XX:XX:XX:XX pattern (case insensitive)
- [ ] All 100 keys are stored in validKeys array
- [ ] localStorage properly stores and retrieves key-MAC bindings
- [ ] Use count increments correctly on reuse

### Functional Checks
- [ ] License validation passes with any of the 100 valid keys
- [ ] License validation fails with invalid format
- [ ] License validation fails with non-existent key (right format but not in list)
- [ ] MAC binding persists across page refresh
- [ ] MAC binding works correctly on device reuse
- [ ] MAC binding prevents key reuse on different device
- [ ] Flash button enables/disables based on license state
- [ ] Flash button works for FW2-5 without license
- [ ] Console shows appropriate messages for each scenario

### UI/UX Checks
- [ ] License section appears only for Firmware 1
- [ ] License section has blue theme matching site
- [ ] License input has maxlength=23 (MZxA-xxxx-xxxx-xxxx)
- [ ] Placeholder shows "MZxA-xxxx-xxxx-xxxx" format example
- [ ] Status messages are color-coded (green/red/blue)
- [ ] Status messages auto-scroll into view
- [ ] Input cleared on error
- [ ] Input preserved on validation attempt without device/firmware

### Security Checks
- [ ] Device MAC verified before binding
- [ ] MAC format validated (XX:XX:XX:XX:XX:XX)
- [ ] Only 100 pre-generated keys accepted
- [ ] Key-MAC bindings immutable (can't rebind key to different MAC)
- [ ] localStorage keys protected from direct access
- [ ] No sensitive data logged to console (sanitized by SecurityManager)

### Integration Checks
- [ ] Firmware selection triggers license visibility
- [ ] Device connection triggers MAC detection
- [ ] License validation triggers flash button update
- [ ] All three components (Device, Firmware, License) work together
- [ ] Flashing blocked if any component fails validation

---

## Implementation Details

### LicenseManager.validateKey() Logic

```javascript
async validateKey(key, macAddress) {
    // 1. Check format
    if (!this.isValidFormat(key)) {
        return { valid: false, message: 'Invalid key format' };
    }

    // 2. Check if key exists
    if (!this.isValidKey(key)) {
        return { valid: false, message: 'Key not found or invalid' };
    }

    // 3. Check binding status
    const boundData = this.getBoundMAC(key);
    
    if (!boundData) {
        // First use - bind
        this.bindKeyToMAC(key, macAddress);
        return { valid: true, message: 'Key activated for this device', firstUse: true };
    }

    // 4. Check MAC match
    if (boundData.mac === macAddress) {
        // Reuse - increment count
        this.incrementUseCount(key);
        return { valid: true, message: `Key verified (Used ${boundData.useCount + 1} times)`, firstUse: false };
    } else {
        // Different MAC - reject
        return { valid: false, message: 'Key already bound to another device' };
    }
}
```

### updateFlashButtonState() Logic

```javascript
updateFlashButtonState() {
    const flashBtn = document.getElementById('flashBtn');
    
    // Basic requirements
    const canFlash = this.esploader && this.firmwareData && this.deviceMAC;
    
    if (!canFlash) {
        flashBtn.disabled = true;
        return;
    }
    
    // Additional check for FW1
    if (this.selectedFirmwareId === 1) {
        flashBtn.disabled = !this.licenseValidated;  // FW1 requires license
    } else {
        flashBtn.disabled = false;  // FW2-5 don't require license
    }
}
```

---

## Storage Format

### localStorage Keys

#### miniz_used_keys
```javascript
{
    "MZ1A-K9X4-7P2M-5R8T": {
        "mac": "AA:BB:CC:DD:EE:FF",
        "firstUsed": "2024-01-15T10:30:00.000Z",
        "useCount": 3,
        "lastUsed": "2024-01-15T14:45:30.000Z"
    },
    "MZ2B-L3Y6-8Q4N-6S9U": {
        "mac": "11:22:33:44:55:66",
        "firstUsed": "2024-01-15T11:20:00.000Z",
        "useCount": 1
    }
    // ... additional keys
}
```

#### esp_session_key
- Used for generating fallback session MAC if no device MAC available
- Format: Random hex string (first use)
- Purpose: Ensures consistent session MAC across page reloads for same browser

---

## Known Limitations

1. **Browser Specific**: License bindings stored per-browser. Different browser = different binding (requires new key)
2. **No Server Sync**: All validation happens client-side. Clearing localStorage = losing key-MAC bindings
3. **Session MAC**: If device MAC unreadable, uses deterministic but browser-specific MAC
4. **One-Time Binding**: Once key bound to MAC, cannot be reused on different device (by design)
5. **100 Keys Max**: System designed for 100 simultaneous users (expandable by editing license.js)

---

## Troubleshooting

### Issue: "Device must be connected first" after connecting
**Cause**: MAC detection failed in all methods
**Solution**: 
- Check Web Serial connection is working
- Try different USB port
- Firmware may need updating
- Use fallback session MAC (will generate automatically)

### Issue: "Key already bound to another device" with correct key
**Cause**: Key cached in browser with different MAC from previous session
**Solution**:
- Clear browser cache/localStorage
- Try different browser
- Verify MAC address matches what you bound the key to

### Issue: Flash button disabled after license validation
**Cause**: updateFlashButtonState() not called after validation
**Solution**:
- Check licenseValidated flag is set to true
- Check validateLicenseUI() actually calls updateFlashButtonState()
- Verify no JavaScript errors in browser console

### Issue: License key input field not visible
**Cause**: FW1 not selected or license section CSS hidden
**Solution**:
- Select Firmware 1 from the firmware cards
- Check license section data-id=1 in HTML
- Verify styles.css license section not display:none

---

## Next Steps for User

1. **Connect actual ESP32-S3 device** to verify MAC address detection
2. **Test all 10 scenarios** above with real hardware
3. **Verify localStorage** persistence across browser sessions
4. **Test with multiple devices** to confirm MAC-based binding works
5. **Monitor console logs** for MAC detection method used (EFUSE/OTP/ChipID/Session)

---

**Document Generated**: 2024
**System Version**: 3.0 (Complete license system with MAC binding)
**Status**: Ready for functional testing with actual hardware
