# PMScan V2 - Complete Application Documentation

## Table of Contents
1. [Application Overview](#application-overview)
2. [Architecture & Structure](#architecture--structure)
3. [Core Features & Functionality](#core-features--functionality)
4. [Data Flow & Storage](#data-flow--storage)
5. [User Guide](#user-guide)
6. [Developer Guide](#developer-guide)
7. [Component Relationships](#component-relationships)
8. [API Integrations](#api-integrations)

## Application Overview

PMScan V2 is a progressive web application (PWA) designed for real-time air quality monitoring using Bluetooth-connected particulate matter (PM) sensors. The app provides comprehensive air quality data collection, analysis, and collaboration features for environmental monitoring.

### Primary Purpose
- **Real-time Monitoring**: Connect to PM sensors via Bluetooth to collect live air quality data
- **Data Recording**: Create missions to record air quality measurements with contextual information
- **Analysis**: Provide statistical analysis, WHO compliance tracking, and pollution source breakdown
- **Collaboration**: Enable group-based monitoring with shared settings and data
- **Export**: Generate reports in CSV and PDF formats for further analysis

### Key Technologies
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Supabase (Database, Authentication, Edge Functions)
- **Mobile**: Capacitor for native capabilities
- **Mapping**: Mapbox for location visualization
- **Sensors**: Bluetooth LE integration for PM sensor connectivity

## Architecture & Structure

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │   Supabase      │    │   External APIs │
│                 │    │   Backend       │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Components  │ │    │ │ Database    │ │    │ │ Weather     │ │
│ │ Hooks       │ │◄──►│ │ Auth        │ │◄──►│ │ Mapbox      │ │
│ │ Services    │ │    │ │ Storage     │ │    │ │ AtmoSud     │ │
│ │ Contexts    │ │    │ │ Functions   │ │    │ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### File Organization

```
src/
├── components/           # UI Components
│   ├── shared/          # Reusable components
│   ├── ui/              # Shadcn/ui base components
│   ├── Analysis/        # Data analysis features
│   ├── Groups/          # Group management
│   ├── History/         # Mission history
│   ├── RealTime/        # Live monitoring
│   └── ...              # Feature-specific components
├── hooks/               # Custom React hooks
├── contexts/            # React contexts for global state
├── pages/               # Route-level components
├── lib/                 # Utility functions & services
├── services/            # Core business logic
├── types/               # TypeScript definitions
├── integrations/        # External service integrations
└── i18n/               # Internationalization
```

## Core Features & Functionality

### 1. Real-Time Monitoring

**Components Involved:**
- `src/pages/RealTime.tsx` - Main real-time view
- `src/components/RealTime/AirQualityCards.tsx` - Live data display
- `src/components/PMScanConnectionStatus.tsx` - Connection status
- `src/hooks/usePMScanBluetooth.ts` - Bluetooth connectivity
- `src/lib/pmscan/` - PM sensor communication

**How It Works:**
1. User connects to a PM sensor via Bluetooth using the connection dialog
2. The `usePMScanBluetooth` hook manages the Bluetooth connection and data parsing
3. Live PM data (PM1, PM2.5, PM10) is displayed in real-time cards
4. GPS location is tracked automatically when available
5. Users can toggle between map and graph views to visualize data

**Data Flow:**
```
PM Sensor → Bluetooth → usePMScanBluetooth → PMScanData → AirQualityCards → UI
```

### 2. Mission Recording

**Components Involved:**
- `src/components/RecordingControls/` - Recording interface
- `src/services/recordingService.ts` - Core recording logic
- `src/hooks/useRecordingService.ts` - Recording state management
- `src/lib/missionManager.ts` - Mission creation and management
- `src/hooks/useMissionSaver.ts` - Mission persistence

**How It Works:**
1. User starts a recording session with configurable frequency
2. Data points are collected automatically based on the selected frequency
3. Each measurement includes:
   - PM sensor data (PM1, PM2.5, PM10)
   - GPS coordinates (if available)
   - Manual context (location/activity)
   - Automatic context (ML-detected activity if enabled)
   - Timestamp
4. Mission is saved locally and synced to Supabase when complete

**Recording States:**
- `idle` - Not recording
- `recording` - Actively collecting data
- `paused` - Recording paused but can be resumed

### 3. Data Storage & Synchronization

**Components Involved:**
- `src/lib/dataStorage.ts` - Local storage management
- `src/lib/dataSync.ts` - Supabase synchronization
- `src/services/storageService.ts` - Storage abstraction layer
- Local Storage for offline capability
- Supabase database for cloud sync

**Storage Architecture:**
```
Local Storage (Offline)     ←→     Supabase (Cloud)
├── Missions                       ├── missions
├── Measurements                   ├── measurements  
├── Events                         ├── events
├── Weather Data                   ├── weather_data
└── Air Quality Data               └── air_quality_data
```

**Sync Process:**
1. Data is initially stored locally for offline capability
2. Background sync automatically uploads data when internet is available
3. Weather and air quality data is enriched via external APIs
4. Conflicts are resolved using timestamp-based merging

### 4. Group Collaboration

**Components Involved:**
- `src/pages/Groups.tsx` - Group management interface
- `src/components/Groups/` - Group-related components
- `src/hooks/useGroups.ts` - Group operations
- `src/hooks/useGroupSettings.ts` - Group configuration

**Group Features:**
- **Group Creation**: Admins can create groups with custom settings
- **Member Management**: Invite users via email with role-based permissions
- **Shared Thresholds**: Configure air quality thresholds for the entire group
- **Data Sharing**: View and analyze group members' missions
- **Settings Inheritance**: Group settings override individual user settings

**Permission Levels:**
- `admin` - Full control over group settings and membership
- `member` - Can view group data and contribute measurements

### 5. Analysis & Reporting

**Components Involved:**
- `src/pages/Analysis.tsx` - Analysis dashboard
- `src/components/Analysis/` - Analysis components
- `src/lib/csvExport.ts` - CSV export functionality
- `src/lib/pdfExport.ts` - PDF report generation

**Analysis Features:**
- **Statistical Analysis**: Mean, median, percentiles for PM measurements
- **WHO Compliance**: Track compliance with WHO air quality guidelines
- **Pollution Breakdown**: Categorize pollution sources and types
- **Activity Analysis**: Correlate air quality with user activities
- **Time Series**: Visualize trends over time
- **Group Comparison**: Compare performance across group members

### 6. Map Integration

**Components Involved:**
- `src/components/MapboxMap/` - Mapbox integration
- `src/lib/mapbox/` - Map utilities and configuration
- `src/hooks/useGPS.ts` - GPS location tracking

**Map Features:**
- Real-time location tracking during missions
- Mission route visualization
- Air quality heatmaps
- Point-of-interest marking
- Multiple map styles (street, satellite, terrain)

## Data Flow & Storage

### Data Types & Relationships

```typescript
// Core data structure
interface MissionData {
  id: string
  name: string
  startTime: Date
  endTime: Date
  measurements: MeasurementData[]
  context: MissionContext
  synced: boolean
}

interface MeasurementData {
  timestamp: Date
  pm1: number    // PM1 concentration (μg/m³)
  pm25: number   // PM2.5 concentration (μg/m³) 
  pm10: number   // PM10 concentration (μg/m³)
  location?: LocationData
  context?: MissionContext
  automaticContext?: string
}
```

### State Management Flow

```
User Action → Component → Hook → Service → Storage → Sync → UI Update
```

**Example: Starting a Recording**
1. User clicks "Start Recording" button
2. `RecordingButton` component calls `startRecording()` from `useRecordingService`
3. Hook triggers `recordingService.startRecording()`
4. Service updates internal state and starts data collection timer
5. PM data flows through `usePMScanBluetooth` → `addDataPoint()` → local storage
6. UI automatically updates via state subscriptions

### Context Management

The app uses React Context for global state:

- **AuthContext**: User authentication state
- **RecordingContext**: Recording session state  
- **ThresholdContext**: Air quality thresholds
- **AlertContext**: User notifications

## User Guide

### Getting Started

1. **Device Connection**
   - Open the app and navigate to the Real-Time tab
   - Tap "Connect Device" to scan for PM sensors
   - Select your sensor from the list and establish connection
   - Verify data is flowing by checking the live readings

2. **Recording Your First Mission**
   - Ensure your device is connected and showing live data
   - Navigate to the recording controls (floating action button)
   - Tap "Start Recording" and select measurement frequency
   - Add contextual information (location, activity)
   - Move around to collect varied measurements
   - Tap "Stop Recording" when finished

3. **Viewing Mission History**
   - Navigate to the History tab
   - Browse your completed missions
   - Tap any mission to view detailed analysis
   - Use the date filter to find specific missions
   - Export data using the share button

### Advanced Features

**Group Collaboration:**
1. Create or join a group via the Groups tab
2. Configure group thresholds and settings (admin only)
3. Invite members using their email addresses
4. View group-wide statistics and comparisons

**Analysis Tools:**
1. Navigate to the Analysis tab
2. Select date range and data sources
3. Choose analysis type (statistical, WHO compliance, etc.)
4. Generate and export reports

**Custom Thresholds:**
1. Go to Settings → Custom Thresholds
2. Set personalized air quality thresholds
3. Configure alert notifications
4. Apply to specific activities or locations

## Developer Guide

### Adding New Components

1. **Create Component File**
   ```typescript
   // src/components/NewFeature/NewComponent.tsx
   import { SomeType } from '@/types/app';
   
   interface NewComponentProps {
     data: SomeType;
     onAction: (value: string) => void;
   }
   
   export function NewComponent({ data, onAction }: NewComponentProps) {
     // Component implementation
   }
   ```

2. **Add Corresponding Hook (if needed)**
   ```typescript
   // src/hooks/useNewFeature.ts
   export function useNewFeature() {
     // Hook implementation
   }
   ```

3. **Update Types**
   ```typescript
   // src/types/app.ts
   export interface NewFeatureType {
     // Type definitions
   }
   ```

### Custom Hooks Pattern

The app follows a consistent pattern for custom hooks:

```typescript
export function useFeature() {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performAction = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Async operation
      setState(newState);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dependencies]);

  return { state, loading, error, performAction };
}
```

### Service Layer Pattern

Services encapsulate business logic and external API calls:

```typescript
class FeatureService {
  private static instance: FeatureService;
  
  static getInstance(): FeatureService {
    if (!this.instance) {
      this.instance = new FeatureService();
    }
    return this.instance;
  }

  async performOperation(data: SomeType): Promise<ResultType> {
    // Implementation
  }
}

export const featureService = FeatureService.getInstance();
```

### Testing Guidelines

1. **Component Testing**
   - Use React Testing Library
   - Test user interactions, not implementation details
   - Mock external dependencies

2. **Hook Testing**
   - Use `@testing-library/react-hooks`
   - Test state changes and side effects
   - Mock service dependencies

3. **Service Testing**
   - Unit test business logic
   - Mock external APIs
   - Test error handling

## Component Relationships

### Key Component Dependencies

```
App.tsx
├── AuthContext
├── ThemeProvider
├── RecordingContext
└── Router
    ├── RealTime
    │   ├── AirQualityCards
    │   ├── MapboxMap
    │   └── PMScanConnectionStatus
    ├── History
    │   ├── MissionCard
    │   ├── MissionDetailsDialog
    │   └── ShareDialog
    ├── Analysis
    │   ├── StatisticalAnalysis
    │   ├── WHOComplianceProgress
    │   └── PollutionBreakdown
    └── Groups
        ├── GroupCard
        ├── CreateGroupDialog
        └── InviteUserDialog
```

### Data Flow Between Components

**Recording Flow:**
```
FloatingRecordButton → RecordingControls → useRecordingService → recordingService → usePMScanBluetooth → PMScan Device
```

**Mission Display Flow:**
```
History Page → MissionCard → MissionDetailsDialog → Analysis Components → Charts/Tables
```

**Group Management Flow:**
```
Groups Page → CreateGroupDialog → useGroups → Supabase → Group Settings → Member Invitations
```

## API Integrations

### Supabase Integration

**Database Tables:**
- `missions` - Core mission data
- `measurements` - Individual data points
- `groups` - Group information
- `group_memberships` - User-group relationships
- `profiles` - User profile data
- `events` - Mission events and markers

**Authentication:**
- Email/password authentication
- Profile creation and management
- Role-based access control

**Storage:**
- File uploads for mission exports
- Image storage for events

### External APIs

**Weather Service:**
```typescript
// src/services/weatherService.ts
async function fetchWeatherData(lat: number, lon: number, timestamp: Date) {
  // OpenWeatherMap API integration
}
```

**Air Quality Data:**
```typescript
// AtmoSud API for regional air quality data
async function fetchAirQualityData(location: LocationData) {
  // Regional air quality information
}
```

**Mapbox:**
```typescript
// Map tiles, geocoding, and routing services
const mapboxService = {
  getMapToken: () => // Fetch secure token
  geocode: (address: string) => // Address to coordinates
  reverseGeocode: (lat: number, lon: number) => // Coordinates to address
}
```

### Edge Functions

Located in `supabase/functions/`:
- `fetch-weather` - Weather data enrichment
- `fetch-atmosud-data` - Regional air quality data
- `send-group-invitation` - Email invitations
- `accept-group-invitation` - Join group processing
- `get-mapbox-token` - Secure token retrieval

## Performance Considerations

### Optimization Strategies

1. **Component Memoization**
   - Use `React.memo` for expensive components
   - `useMemo` for calculated values
   - `useCallback` for event handlers

2. **Data Loading**
   - Lazy loading for non-critical components
   - Pagination for large datasets
   - Background sync for better UX

3. **State Management**
   - Minimize context re-renders
   - Local state for component-specific data
   - Debounced API calls

4. **Mobile Optimization**
   - Touch-friendly interfaces (44px minimum)
   - Efficient Bluetooth communication
   - Battery-conscious location tracking

### Bundle Size Management

- Tree-shaking enabled
- Code splitting by routes
- Dynamic imports for heavy components
- Optimized image loading

## Troubleshooting Common Issues

### Bluetooth Connection Problems
1. Check device compatibility and permissions
2. Ensure PM sensor is in pairing mode
3. Clear browser cache and reload
4. Verify Bluetooth is enabled on device

### Sync Issues
1. Check internet connectivity
2. Verify Supabase configuration
3. Clear local storage if corrupted
4. Check browser console for errors

### Performance Issues
1. Reduce recording frequency
2. Clear old mission data
3. Disable automatic context detection
4. Check available device memory

## Security & Privacy

### Data Protection
- All data encrypted in transit (HTTPS)
- Supabase RLS policies enforce access control
- Local data stored securely
- No sensitive data in localStorage

### User Privacy
- Location data only stored with user consent
- Group data sharing requires explicit membership
- Export features respect user permissions
- GDPR-compliant data handling

---

This documentation provides a comprehensive overview of PMScan V2. For specific implementation details, refer to the source code and inline comments. For updates and contributions, follow the development guidelines outlined in ARCHITECTURE.md.