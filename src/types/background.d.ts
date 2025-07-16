// Background sync and wake lock API type definitions

interface WakeLockSentinel {
  readonly released: boolean;
  readonly type: 'screen';
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}

interface WakeLock {
  request(type: 'screen'): Promise<WakeLockSentinel>;
}

interface Navigator {
  wakeLock: WakeLock;
}

interface ServiceWorkerRegistration {
  sync: SyncManager;
}

interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface ExtendedServiceWorkerGlobalScope extends ServiceWorkerGlobalScope {
  registration: ServiceWorkerRegistration & {
    sync: SyncManager;
  };
}

interface SyncEvent extends ExtendedEvent {
  tag: string;
  lastChance: boolean;
}

// Notification types
interface NotificationOptions {
  actions?: NotificationAction[];
  badge?: string;
  body?: string;
  data?: Record<string, unknown>;
  dir?: 'auto' | 'ltr' | 'rtl';
  icon?: string;
  image?: string;
  lang?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  timestamp?: number;
  vibrate?: number[];
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

declare global {
  interface WindowEventMap {
    sync: SyncEvent;
  }
}
