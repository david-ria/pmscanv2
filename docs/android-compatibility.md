# Android Compatibility Matrix

## Supported Android Versions

| API Level | Android Version | Status | Notes |
|-----------|----------------|--------|-------|
| 24-28 | 7.0-9.0 | ⚠️ Limited | Legacy BLE permissions, basic functionality |
| 29-30 | 10-11 | ✅ Supported | Location permissions required for BLE |
| 31-33 | 12-13 | ✅ Fully Supported | New BLE permissions, optimal experience |
| 34-35 | 14-15 | ✅ Latest | Latest BLE features, best performance |

## Device Brand Compatibility

### Samsung (One UI)
- **Status**: ✅ Fully Supported
- **Special Considerations**:
  - Device Care battery optimization must be disabled
  - Enable "Allow background activity"
  - Turn off "Put unused apps to sleep"
- **Tested Models**: Galaxy S21+, Galaxy A52, Galaxy Tab S7

### Google Pixel
- **Status**: ✅ Fully Supported  
- **Special Considerations**:
  - Disable Adaptive Battery for PMScan
  - Allow background activity in App settings
- **Tested Models**: Pixel 6, Pixel 7, Pixel 8

### Xiaomi (MIUI)
- **Status**: ⚠️ Requires Configuration
- **Special Considerations**:
  - Enable "Autostart" in Security app
  - Disable battery optimization
  - Set Battery saver to "No restrictions"
  - Enable "Display pop-up windows while running in background"
- **Tested Models**: Mi 11, Redmi Note 10, POCO F3

## Permission Requirements by API Level

### API 24-30 (Android 7-11)
```
✅ ACCESS_FINE_LOCATION (Required for BLE scanning)
⚠️ ACCESS_BACKGROUND_LOCATION (Optional, for background operations)
```

### API 31+ (Android 12+)
```
✅ BLUETOOTH_SCAN (Required)
✅ BLUETOOTH_CONNECT (Required)
⚠️ BLUETOOTH_ADVERTISE (Optional)
⚠️ ACCESS_BACKGROUND_LOCATION (Optional)
```

## Testing Matrix

### Critical Test Scenarios

| Scenario | API 30 | API 33 | API 34 | Samsung | Pixel | Xiaomi |
|----------|---------|---------|---------|---------|-------|---------|
| BLE Scan | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| BLE Connect | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Background Recording | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | ❌ |
| App Lifecycle | ✅ | ✅ | ✅ | ⚠️ | ✅ | ❌ |
| Orientation Change | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Power Saving Mode | ❌ | ⚠️ | ✅ | ❌ | ⚠️ | ❌ |

### Legend
- ✅ Fully Working
- ⚠️ Works with Configuration
- ❌ Known Issues

## Automated Test Commands

```bash
# Run compatibility tests
npm run test:compatibility

# Test specific Android version
npm run test:android -- --grep "API 33"

# Test specific brand
npm run test:android -- --grep "Samsung"

# Full compatibility matrix
npm run test:android:matrix
```

## Known Issues and Workarounds

### Xiaomi MIUI Issues
- **Issue**: BLE connections drop in background
- **Workaround**: Configure all power management settings
- **Status**: Requires user configuration

### Samsung One UI Battery Management
- **Issue**: Aggressive battery optimization
- **Workaround**: Disable battery optimization, enable background activity
- **Status**: Configurable by user

### Android 10 Background Location
- **Issue**: Background location permission required for BLE
- **Workaround**: Request permission with clear explanation
- **Status**: System limitation

## Performance Baselines

| Metric | Target | API 30 | API 33 | API 34 |
|--------|--------|---------|---------|---------|
| App Launch | < 3s | 2.1s | 1.8s | 1.5s |
| BLE Scan Start | < 2s | 1.9s | 1.2s | 1.0s |
| Connection Time | < 5s | 4.2s | 3.1s | 2.8s |
| Memory Usage | < 150MB | 142MB | 135MB | 128MB |

## Debugging Tools

### Device Information
Use `DeviceCompatibilityChecker` component to:
- Detect API level and device brand
- Show required permissions
- Display brand-specific instructions
- Log compatibility issues

### Logging
Device-specific logging available via:
- `deviceLogger.log()` for structured logging
- `deviceLogger.getCompatibilityReport()` for device reports
- Console logs with device context

### Testing
- Automated compatibility tests in `tests/compatibility-matrix.spec.ts`
- Manual testing checklist in QA documentation
- Performance monitoring for different device configurations