# MTU Optimization Documentation

## Overview

Maximum Transmission Unit (MTU) optimization is a critical feature for improving Bluetooth Low Energy (BLE) performance in PMScan applications. This document outlines the implementation details, benefits, and usage of the MTU optimization system.

## What is MTU?

MTU (Maximum Transmission Unit) defines the maximum number of bytes that can be transmitted in a single BLE packet. The default BLE MTU is 23 bytes, with 20 bytes available for actual data (3 bytes are reserved for BLE protocol overhead).

### MTU Sizes

- **Default MTU**: 23 bytes (20 bytes effective payload)
- **Common Android MTU**: 185-247 bytes after negotiation
- **Optimal MTU**: 512 bytes (when supported by both devices)

## Implementation Architecture

### Core Components

1. **MtuManager** (`src/lib/pmscan/mtuManager.ts`)
   - Handles MTU negotiation for both native and web platforms
   - Provides MTU information and fragmentation analysis
   - Manages fallback scenarios

2. **FragmentManager** (`src/lib/pmscan/mtuManager.ts`)
   - Automatically detects and reassembles fragmented notifications
   - Provides transparent fragmentation handling
   - Implements fragment timeout and cleanup

3. **MtuMonitorService** (`src/services/mtuMonitor.ts`)
   - Monitors MTU performance and fragmentation statistics
   - Provides performance recommendations
   - Logs diagnostic information

4. **MtuInfoDisplay** (`src/components/MtuInfoDisplay.tsx`)
   - Visual component showing MTU status and performance
   - Real-time fragmentation statistics
   - Performance recommendations UI

### Integration Points

- **Device Initializers**: MTU negotiation occurs immediately after BLE connection
- **Notification Handlers**: All notifications are processed through FragmentManager
- **Monitoring**: Continuous performance tracking and diagnostics

## Benefits

### Performance Improvements

- **Reduced Fragmentation**: Larger MTU reduces the need to split data across multiple packets
- **Lower Latency**: Fewer round trips needed for large data transfers
- **Better Throughput**: More efficient use of BLE bandwidth
- **Improved Reliability**: Less chance of packet loss during multi-fragment transfers

### User Experience

- **Faster Data Updates**: Real-time data arrives more quickly
- **Better Battery Life**: More efficient radio usage
- **Reduced Connection Issues**: Fewer opportunities for transmission errors

## Platform Support

### Native Android (via Capacitor)

- ✅ **MTU Negotiation**: Automatic negotiation up to 512 bytes
- ✅ **Fragment Detection**: Intelligent fragmentation handling
- ✅ **Performance Monitoring**: Full statistics and diagnostics

### Web Bluetooth

- ⚠️ **Limited MTU**: Stuck with default 23-byte MTU
- ✅ **Fragment Handling**: Transparent fragmentation support
- ✅ **Performance Monitoring**: Statistics available but limited by MTU

### iOS (Future Support)

- 🔄 **Planned**: Will be implemented when iOS support is added
- Expected to support similar MTU negotiation capabilities

## Usage Examples

### Basic MTU Information

```typescript
import { MtuManager } from '@/lib/pmscan/mtuManager';

// Get current MTU info
const mtuInfo = MtuManager.getCurrentMtu();
if (mtuInfo) {
  console.log(`MTU: ${mtuInfo.negotiated} bytes`);
  console.log(`Effective payload: ${mtuInfo.effective} bytes`);
  console.log(`Supports extended data: ${mtuInfo.supportsExtended}`);
}
```

### Performance Monitoring

```typescript
import { MtuMonitorService } from '@/services/mtuMonitor';

// Get performance statistics
const stats = MtuMonitorService.getStats();
console.log(`Fragmentation rate: ${stats.fragmentation.fragmentationRate}%`);

// Get recommendations
const recommendations = MtuMonitorService.getRecommendations();
recommendations.forEach(rec => console.log(`Recommendation: ${rec}`));
```

### UI Integration

```tsx
import { MtuInfoDisplay } from '@/components/MtuInfoDisplay';

// Display MTU information in your component
<MtuInfoDisplay isConnected={device?.connected || false} />
```

## Configuration

### MTU Settings

```typescript
// src/lib/pmscan/mtuManager.ts
export const MTU_CONFIG = {
  DEFAULT: 23,          // Default BLE MTU
  PREFERRED: 512,       // Preferred MTU for negotiation
  MIN_EFFECTIVE: 20,    // Minimum effective payload
  NEGOTIATION_TIMEOUT: 5000,  // Timeout for MTU negotiation
};
```

### Fragment Management

```typescript
// Fragment timeout (5 seconds)
private static readonly FRAGMENT_TIMEOUT = 5000;

// Automatic cleanup interval (10 seconds)
setInterval(() => {
  FragmentManager.cleanupExpiredFragments();
}, 10000);
```

## Performance Metrics

### Key Indicators

- **MTU Size**: Actual negotiated MTU value
- **Fragmentation Rate**: Percentage of notifications requiring fragmentation
- **Average Notification Size**: Mean size of received data packets
- **Fragmentation Overhead**: Additional bytes required for fragmentation

### Optimization Targets

- **Fragmentation Rate**: < 10% (optimal), < 25% (acceptable)
- **MTU Size**: ≥ 185 bytes (good), ≥ 512 bytes (optimal)
- **Fragment Timeout**: < 1 second for typical data

## Troubleshooting

### Common Issues

1. **MTU Negotiation Fails**
   - **Cause**: Device doesn't support larger MTU
   - **Solution**: Falls back to default MTU automatically
   - **Impact**: Higher fragmentation rate

2. **High Fragmentation Rate**
   - **Cause**: Data packets larger than effective MTU
   - **Solution**: Consider reducing data payload size
   - **Monitoring**: Check MtuInfoDisplay for recommendations

3. **Fragment Assembly Timeouts**
   - **Cause**: Lost packets or slow transmission
   - **Solution**: Fragments are automatically cleaned up
   - **Monitoring**: Check logs for timeout warnings

### Diagnostic Tools

- **MtuInfoDisplay**: Visual performance indicators
- **Console Logs**: Detailed MTU negotiation and fragment logs
- **Performance Stats**: Real-time fragmentation monitoring

## Testing

### Compatibility Tests

The system includes automated tests for various Android API levels and MTU scenarios:

```typescript
// Test MTU optimization features
await expect(page.getByTestId('mtu-info')).toBeVisible();
```

### Manual Testing

1. Connect to a PMScan device
2. Check MTU information in DeviceCompatibilityChecker
3. Monitor fragmentation rates during data transmission
4. Verify performance recommendations

## Future Enhancements

### Planned Features

- **Dynamic MTU Adjustment**: Automatic MTU optimization based on data patterns
- **Advanced Fragment Prediction**: Smarter fragmentation detection algorithms
- **Cross-Platform MTU Sync**: Consistent MTU handling across all platforms
- **Performance Analytics**: Historical MTU performance tracking

### Optimization Opportunities

- **Adaptive Chunking**: Adjust chunk sizes based on connection quality
- **Predictive Fragmentation**: Pre-allocate buffers for expected fragments
- **Connection Quality Metrics**: Factor in signal strength and error rates

## Best Practices

### Implementation Guidelines

1. **Always negotiate MTU** immediately after connection
2. **Handle fragmentation transparently** in notification handlers
3. **Monitor performance continuously** for optimization opportunities
4. **Provide user feedback** on connection quality and performance
5. **Implement graceful fallbacks** for MTU negotiation failures

### Performance Optimization

1. **Minimize data payload size** when possible
2. **Batch related data** into single notifications
3. **Monitor fragmentation rates** and optimize accordingly
4. **Use appropriate MTU for data type** (RT vs extended data)

## Conclusion

MTU optimization significantly improves BLE performance and user experience in PMScan applications. The implementation provides transparent handling of MTU negotiation, fragmentation, and performance monitoring while maintaining compatibility across platforms.

The system automatically optimizes performance where possible and provides clear feedback when manual optimization might be beneficial.