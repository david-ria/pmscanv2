import { 
  PMScanConnectionState, 
  PMScanStateTransition, 
  PMScanStateMachineCallbacks,
  STATE_TIMEOUTS,
  VALID_TRANSITIONS 
} from './connectionState';
import * as logger from '@/utils/logger';

export class PMScanStateMachine {
  private currentState: PMScanConnectionState = PMScanConnectionState.IDLE;
  private stateHistory: PMScanStateTransition[] = [];
  private callbacks: PMScanStateMachineCallbacks;
  private stateTimeout: NodeJS.Timeout | null = null;
  private errorCount = 0;
  private maxErrors = 3;

  constructor(callbacks: PMScanStateMachineCallbacks = {}) {
    this.callbacks = callbacks;
    logger.debug('🔄 PMScan State Machine initialized in IDLE state');
  }

  public getState(): PMScanConnectionState {
    return this.currentState;
  }

  public getStateHistory(): PMScanStateTransition[] {
    return [...this.stateHistory];
  }

  public isConnected(): boolean {
    return this.currentState === PMScanConnectionState.CONNECTED || 
           this.currentState === PMScanConnectionState.PARTIAL_CONNECTED;
  }

  public isConnecting(): boolean {
    return this.currentState === PMScanConnectionState.SCANNING ||
           this.currentState === PMScanConnectionState.CONNECTING ||
           this.currentState === PMScanConnectionState.INITIALIZING ||
           this.currentState === PMScanConnectionState.RECONNECTING;
  }

  public canDisconnect(): boolean {
    return this.currentState === PMScanConnectionState.CONNECTED ||
           this.currentState === PMScanConnectionState.PARTIAL_CONNECTED ||
           this.currentState === PMScanConnectionState.ERROR;
  }

  public transition(
    newState: PMScanConnectionState, 
    context?: string,
    skipValidation: boolean = false
  ): boolean {
    const previousState = this.currentState;

    // Validate transition unless skipped
    if (!skipValidation && !this.isValidTransition(previousState, newState)) {
      const error = new Error(
        `Invalid state transition from ${previousState} to ${newState}`
      );
      logger.error('❌ Invalid state transition:', error);
      this.callbacks.onError?.(error, previousState);
      return false;
    }

    // Clear existing timeout
    this.clearStateTimeout();

    // Update state
    this.currentState = newState;

    // Record transition
    const transition: PMScanStateTransition = {
      from: previousState,
      to: newState,
      timestamp: new Date(),
      context
    };
    this.stateHistory.push(transition);

    // Keep only last 50 transitions
    if (this.stateHistory.length > 50) {
      this.stateHistory = this.stateHistory.slice(-50);
    }

    // Reset error count on successful transition to CONNECTED
    if (newState === PMScanConnectionState.CONNECTED) {
      this.errorCount = 0;
    }

    // Increment error count on ERROR state
    if (newState === PMScanConnectionState.ERROR) {
      this.errorCount++;
    }

    logger.debug(
      `🔄 State transition: ${previousState} → ${newState}${
        context ? ` (${context})` : ''
      }`
    );

    // Set timeout for states that need it
    this.setStateTimeout(newState);

    // Notify callback
    this.callbacks.onStateChange?.(previousState, newState, context);

    return true;
  }

  public transitionToError(error: Error, context?: string): void {
    logger.error('❌ PMScan State Machine error:', error);
    
    // Avoid invalid ERROR → ERROR transitions by short-circuiting when already in ERROR
    if (this.currentState === PMScanConnectionState.ERROR) {
      this.errorCount++;
      this.callbacks.onError?.(error, this.currentState);
      return;
    }
    
    if (this.errorCount >= this.maxErrors) {
      logger.error('❌ Max errors reached, forcing IDLE state');
      this.transition(PMScanConnectionState.IDLE, 'Max errors reached', true);
    } else {
      this.transition(PMScanConnectionState.ERROR, context || error.message);
    }
    
    this.callbacks.onError?.(error, this.currentState);
  }

  public reset(): void {
    this.clearStateTimeout();
    this.currentState = PMScanConnectionState.IDLE;
    this.errorCount = 0;
    this.stateHistory = [];
    logger.debug('🔄 State Machine reset to IDLE');
  }

  private isValidTransition(
    from: PMScanConnectionState, 
    to: PMScanConnectionState
  ): boolean {
    const validStates = VALID_TRANSITIONS[from];
    return validStates?.includes(to) || false;
  }

  private setStateTimeout(state: PMScanConnectionState): void {
    const timeout = STATE_TIMEOUTS[state];
    
    if (timeout) {
      this.stateTimeout = setTimeout(() => {
        logger.warn(`⏰ State timeout in ${state} after ${timeout}ms`);
        this.callbacks.onTimeout?.(state);
        
        // Auto-transition to ERROR on timeout
        if (state !== PMScanConnectionState.ERROR) {
          this.transitionToError(
            new Error(`State timeout in ${state}`),
            'Timeout'
          );
        }
      }, timeout);
    }
  }

  private clearStateTimeout(): void {
    if (this.stateTimeout) {
      clearTimeout(this.stateTimeout);
      this.stateTimeout = null;
    }
  }

  public destroy(): void {
    this.clearStateTimeout();
    this.callbacks = {};
  }
}
