# Custom Hooks

This directory contains custom React hooks that encapsulate business logic and state management.

## Hook Categories

### Data Management
- `useAirQualityData` - Fetches and manages air quality data
- `useRecordingService` - Unified recording system using singleton RecordingService
- `useSensorData` - Handles PM sensor data collection

### User Interface
- `useDialog` - Modal dialog state management
- `useIsMobile` - Mobile/desktop detection hook
- `useNotifications` - Notification system integration

### Authentication & Settings
- `useUserSettings` - User preferences and configuration
- `useGroupSettings` - Group management and settings

### Background Services
- `useBackgroundRecording` - Background recording functionality
- `useAutoSync` - Automatic data synchronization

## Best Practices

- All hooks should be properly typed with TypeScript
- Use meaningful return values and error handling
- Include cleanup functions for subscriptions and timers
- Follow React hooks rules (only call at component top level)