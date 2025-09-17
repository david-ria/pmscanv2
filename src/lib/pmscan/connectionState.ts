export enum PMScanConnectionState {
  IDLE = 'idle',
  SCANNING = 'scanning',
  CONNECTING = 'connecting',
  INITIALIZING = 'initializing',
  CONNECTED = 'connected',
  PARTIAL_CONNECTED = 'partial_connected',
  DISCONNECTING = 'disconnecting',
  ERROR = 'error',
  RECONNECTING = 'reconnecting'
}

export interface PMScanStateTransition {
  from: PMScanConnectionState;
  to: PMScanConnectionState;
  timestamp: Date;
  context?: string;
}

export type StateChangeCallback = (from: PMScanConnectionState, to: PMScanConnectionState, context?: string) => void;
export type ErrorCallback = (error: Error, state: PMScanConnectionState) => void;
export type TimeoutCallback = (state: PMScanConnectionState) => void;

export interface PMScanStateMachineCallbacks {
  onStateChange?: StateChangeCallback;
  onError?: ErrorCallback;
  onTimeout?: TimeoutCallback;
}

export const STATE_TIMEOUTS = {
  [PMScanConnectionState.SCANNING]: 30000, // 30 seconds
  [PMScanConnectionState.CONNECTING]: 10000, // 10 seconds
  [PMScanConnectionState.INITIALIZING]: 15000, // 15 seconds
  [PMScanConnectionState.DISCONNECTING]: 5000, // 5 seconds
  [PMScanConnectionState.RECONNECTING]: 10000, // 10 seconds
} as const;

export const VALID_TRANSITIONS: Record<PMScanConnectionState, PMScanConnectionState[]> = {
  [PMScanConnectionState.IDLE]: [
    PMScanConnectionState.SCANNING,
    PMScanConnectionState.ERROR
  ],
  [PMScanConnectionState.SCANNING]: [
    PMScanConnectionState.CONNECTING,
    PMScanConnectionState.ERROR,
    PMScanConnectionState.IDLE
  ],
  [PMScanConnectionState.CONNECTING]: [
    PMScanConnectionState.INITIALIZING,
    PMScanConnectionState.ERROR,
    PMScanConnectionState.IDLE,
    PMScanConnectionState.RECONNECTING
  ],
  [PMScanConnectionState.INITIALIZING]: [
    PMScanConnectionState.CONNECTED,
    PMScanConnectionState.PARTIAL_CONNECTED,
    PMScanConnectionState.ERROR,
    PMScanConnectionState.DISCONNECTING
  ],
  [PMScanConnectionState.CONNECTED]: [
    PMScanConnectionState.DISCONNECTING,
    PMScanConnectionState.ERROR,
    PMScanConnectionState.RECONNECTING
  ],
  [PMScanConnectionState.PARTIAL_CONNECTED]: [
    PMScanConnectionState.CONNECTED,
    PMScanConnectionState.DISCONNECTING,
    PMScanConnectionState.ERROR,
    PMScanConnectionState.RECONNECTING
  ],
  [PMScanConnectionState.DISCONNECTING]: [
    PMScanConnectionState.IDLE,
    PMScanConnectionState.ERROR,
    PMScanConnectionState.RECONNECTING
  ],
  [PMScanConnectionState.ERROR]: [
    PMScanConnectionState.IDLE,
    PMScanConnectionState.RECONNECTING,
    PMScanConnectionState.SCANNING
  ],
  [PMScanConnectionState.RECONNECTING]: [
    PMScanConnectionState.CONNECTING,
    PMScanConnectionState.ERROR,
    PMScanConnectionState.IDLE
  ]
};