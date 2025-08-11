/**
 * CRITICAL: Global State Manager
 * Eliminates window object pollution and provides type-safe global state
 */

import { logger } from '@/utils/professionalLogger';
import { AppError } from '@/utils/errorManager';
import { PMScanData, LocationData, DeviceInfo } from '@/types';

// === GLOBAL STATE INTERFACE ===
interface GlobalState {
  // Device data
  currentPMScanData: PMScanData | null;
  connectedDevices: DeviceInfo[];
  
  // Recording state
  isRecording: boolean;
  recordingFrequency: string;
  currentMissionId: string | null;
  
  // Location state
  currentLocation: LocationData | null;
  
  // UI state
  isOnline: boolean;
  currentRoute: string;
  
  // User preferences
  theme: 'light' | 'dark' | 'system';
  language: string;
}

// === STATE MANAGEMENT CLASS ===
class GlobalStateManager {
  private state: GlobalState = {
    currentPMScanData: null,
    connectedDevices: [],
    isRecording: false,
    recordingFrequency: '10s',
    currentMissionId: null,
    currentLocation: null,
    isOnline: navigator.onLine,
    currentRoute: '/',
    theme: 'system',
    language: 'en',
  };

  private listeners = new Map<string, Set<(state: GlobalState) => void>>();
  private componentLogger = logger.createComponentLogger('GlobalStateManager');

  // === STATE GETTERS ===
  getState(): Readonly<GlobalState> {
    return { ...this.state };
  }

  getStateValue<K extends keyof GlobalState>(key: K): GlobalState[K] {
    return this.state[key];
  }

  // === STATE SETTERS ===
  setState(updates: Partial<GlobalState>): void {
    const previousState = { ...this.state };
    this.state = { ...this.state, ...updates };

    this.componentLogger.debug('State updated', {
      updates,
      previousState: this.sanitizeState(previousState),
      newState: this.sanitizeState(this.state),
    });

    this.notifyListeners();
  }

  setStateValue<K extends keyof GlobalState>(key: K, value: GlobalState[K]): void {
    this.setState({ [key]: value } as Partial<GlobalState>);
  }

  // === DEVICE MANAGEMENT ===
  updatePMScanData(data: PMScanData): void {
    this.setState({ currentPMScanData: data });
    this.dispatchEvent('pmScanDataUpdated', data);
  }

  addDevice(device: DeviceInfo): void {
    const devices = this.state.connectedDevices.filter(d => d.id !== device.id);
    devices.push(device);
    this.setState({ connectedDevices: devices });
    
    this.componentLogger.deviceEvent(device.name, 'connected', { deviceId: device.id });
  }

  removeDevice(deviceId: string): void {
    const device = this.state.connectedDevices.find(d => d.id === deviceId);
    const devices = this.state.connectedDevices.filter(d => d.id !== deviceId);
    this.setState({ connectedDevices: devices });
    
    if (device) {
      this.componentLogger.deviceEvent(device.name, 'disconnected', { deviceId });
    }
  }

  // === RECORDING MANAGEMENT ===
  startRecording(frequency: string, missionId: string): void {
    this.setState({
      isRecording: true,
      recordingFrequency: frequency,
      currentMissionId: missionId,
    });

    this.componentLogger.userAction('Recording started', {
      frequency,
      missionId,
    });

    this.dispatchEvent('recordingStarted', { frequency, missionId });
  }

  stopRecording(): void {
    const { currentMissionId } = this.state;
    this.setState({
      isRecording: false,
      currentMissionId: null,
    });

    this.componentLogger.userAction('Recording stopped', { missionId: currentMissionId });
    this.dispatchEvent('recordingStopped', { missionId: currentMissionId });
  }

  // === LOCATION MANAGEMENT ===
  updateLocation(location: LocationData): void {
    this.setState({ currentLocation: location });
    this.dispatchEvent('locationUpdated', location);
  }

  clearLocation(): void {
    this.setState({ currentLocation: null });
  }

  // === NETWORK STATUS ===
  setOnlineStatus(isOnline: boolean): void {
    this.setState({ isOnline });
    
    this.componentLogger.info(`Network status: ${isOnline ? 'online' : 'offline'}`);
    this.dispatchEvent('networkStatusChanged', { isOnline });
  }

  // === ROUTE MANAGEMENT ===
  setCurrentRoute(route: string): void {
    const previousRoute = this.state.currentRoute;
    this.setState({ currentRoute: route });
    
    this.componentLogger.info(`Route changed: ${previousRoute} → ${route}`);
  }

  // === SUBSCRIPTION MANAGEMENT ===
  subscribe(key: string, callback: (state: GlobalState) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }

    const keyListeners = this.listeners.get(key)!;
    keyListeners.add(callback);

    // Return unsubscribe function
    return () => {
      keyListeners.delete(callback);
      if (keyListeners.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  // === EVENT SYSTEM ===
  private dispatchEvent(eventName: string, data?: unknown): void {
    const event = new CustomEvent(`globalState:${eventName}`, {
      detail: { data, timestamp: new Date() },
    });

    try {
      window.dispatchEvent(event);
    } catch (error) {
      this.componentLogger.error('Failed to dispatch event', error instanceof Error ? error : undefined);
    }
  }

  addEventListener<T = unknown>(
    eventName: string,
    callback: (data: T) => void
  ): () => void {
    const handler = (event: CustomEvent) => {
      callback(event.detail?.data);
    };

    const fullEventName = `globalState:${eventName}`;
    window.addEventListener(fullEventName, handler as EventListener);

    return () => {
      window.removeEventListener(fullEventName, handler as EventListener);
    };
  }

  // === UTILITY METHODS ===
  private notifyListeners(): void {
    this.listeners.forEach((keyListeners) => {
      keyListeners.forEach((callback) => {
        try {
          callback(this.state);
        } catch (error) {
          this.componentLogger.error('Listener callback failed', error instanceof Error ? error : undefined);
        }
      });
    });
  }

  private sanitizeState(state: GlobalState): Record<string, unknown> {
    // Remove sensitive or large data for logging
    return {
      ...state,
      currentPMScanData: state.currentPMScanData ? 'PMScanData present' : null,
      connectedDevices: state.connectedDevices.map(d => ({ id: d.id, name: d.name, connected: d.connected })),
    };
  }

  // === PERSISTENCE ===
  saveToStorage(): void {
    try {
      const persistableState = {
        theme: this.state.theme,
        language: this.state.language,
        recordingFrequency: this.state.recordingFrequency,
      };

      localStorage.setItem('globalState', JSON.stringify(persistableState));
    } catch (error) {
      this.componentLogger.error('Failed to save state to storage', error instanceof Error ? error : undefined);
    }
  }

  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('globalState');
      if (stored) {
        const persistedState = JSON.parse(stored);
        this.setState(persistedState);
      }
    } catch (error) {
      this.componentLogger.warn('Failed to load state from storage', { error });
    }
  }

  // === DEBUGGING ===
  getDebugInfo(): Record<string, unknown> {
    return {
      state: this.sanitizeState(this.state),
      listenerCount: this.listeners.size,
      listeners: Array.from(this.listeners.keys()),
    };
  }

  reset(): void {
    this.state = {
      currentPMScanData: null,
      connectedDevices: [],
      isRecording: false,
      recordingFrequency: '10s',
      currentMissionId: null,
      currentLocation: null,
      isOnline: navigator.onLine,
      currentRoute: '/',
      theme: 'system',
      language: 'en',
    };

    this.notifyListeners();
    this.componentLogger.info('Global state reset');
  }
}

// === SINGLETON INSTANCE ===
export const globalState = new GlobalStateManager();

// === REACT HOOKS ===
export function useGlobalState(): [Readonly<GlobalState>, typeof globalState] {
  const [state, setState] = React.useState<GlobalState>(globalState.getState());

  React.useEffect(() => {
    const unsubscribe = globalState.subscribe('react-hook', setState);
    return unsubscribe;
  }, []);

  return [state, globalState];
}

export function useGlobalStateValue<K extends keyof GlobalState>(
  key: K
): [GlobalState[K], (value: GlobalState[K]) => void] {
  const [state] = useGlobalState();
  
  const setValue = React.useCallback((value: GlobalState[K]) => {
    globalState.setStateValue(key, value);
  }, [key]);

  return [state[key], setValue];
}

// === SETUP FUNCTION ===
export function setupGlobalState(): void {
  // Load persisted state
  globalState.loadFromStorage();

  // Setup network status monitoring
  const updateOnlineStatus = () => {
    globalState.setOnlineStatus(navigator.onLine);
  };

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // Save state on page unload
  window.addEventListener('beforeunload', () => {
    globalState.saveToStorage();
  });

  // Setup periodic state persistence
  setInterval(() => {
    globalState.saveToStorage();
  }, 30000); // Save every 30 seconds

  logger.info('Global state manager initialized', globalState.getDebugInfo());
}

// === DEVELOPMENT HELPERS ===
if (process.env.NODE_ENV === 'development') {
  (window as any).__globalState = globalState;
  (window as any).__globalStateDebug = () => globalState.getDebugInfo();
}

export default globalState;