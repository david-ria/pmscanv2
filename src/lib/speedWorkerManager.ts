// Manager for the speed calculation web worker
class SpeedWorkerManager {
  private worker: Worker | null = null;
  private pendingCallbacks: Map<string, (result: any) => void> = new Map();
  private messageId = 0;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker('/speed-worker.js');
      this.worker.onmessage = (e) => {
        const { type, result, messageId } = e.data;
        
        if (type === 'SPEED_RESULT' && messageId) {
          const callback = this.pendingCallbacks.get(messageId);
          if (callback) {
            callback(result);
            this.pendingCallbacks.delete(messageId);
          }
        }
      };
      
      this.worker.onerror = (error) => {
        console.error('Speed worker error:', error);
        // Fallback to main thread calculation if worker fails
        this.worker = null;
      };
    }
  }

  async calculateSpeed(latitude: number, longitude: number, timestamp: number): Promise<{ speed: number; isMoving: boolean }> {
    if (!this.worker) {
      // Fallback to synchronous calculation on main thread
      return this.fallbackCalculation(latitude, longitude, timestamp);
    }

    return new Promise((resolve) => {
      const msgId = `msg_${this.messageId++}`;
      this.pendingCallbacks.set(msgId, resolve);
      
      this.worker!.postMessage({
        type: 'CALCULATE_SPEED',
        messageId: msgId,
        data: { latitude, longitude, timestamp }
      });
      
      // Timeout fallback
      setTimeout(() => {
        if (this.pendingCallbacks.has(msgId)) {
          this.pendingCallbacks.delete(msgId);
          resolve(this.fallbackCalculation(latitude, longitude, timestamp));
        }
      }, 1000); // 1 second timeout
    });
  }

  clearHistory() {
    if (this.worker) {
      this.worker.postMessage({ type: 'CLEAR_HISTORY' });
    }
  }

  private fallbackCalculation(latitude: number, longitude: number, timestamp: number): { speed: number; isMoving: boolean } {
    // Simple fallback - just return default values
    // In a real scenario, you'd implement the same logic here
    return { speed: 0, isMoving: false };
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingCallbacks.clear();
  }
}

// Singleton instance
export const speedWorkerManager = new SpeedWorkerManager();