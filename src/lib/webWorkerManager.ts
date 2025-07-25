// Web Worker Manager for offloading CPU-intensive tasks
interface WorkerTask {
  id: string;
  type: string;
  payload: any;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
}

class WebWorkerManager {
  private worker: Worker | null = null;
  private taskQueue: Map<string, WorkerTask> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.worker = new Worker('/data-processor.js');
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);
      this.isInitialized = true;
    } catch (error) {
      console.warn('Web Worker not supported, falling back to main thread processing');
      this.isInitialized = false;
    }
  }

  private handleWorkerMessage(event: MessageEvent) {
    const { type, id, result, error } = event.data;
    const task = this.taskQueue.get(id);
    
    if (!task) return;

    this.taskQueue.delete(id);

    if (type === 'SUCCESS') {
      task.resolve(result);
    } else if (type === 'ERROR') {
      task.reject(new Error(error));
    }
  }

  private handleWorkerError(error: ErrorEvent) {
    console.error('Web Worker error:', error);
    // Reject all pending tasks
    this.taskQueue.forEach(task => {
      task.reject(new Error('Worker error occurred'));
    });
    this.taskQueue.clear();
  }

  async runTask<T>(type: string, payload: any): Promise<T> {
    await this.initialize();

    // If worker is not available, fall back to main thread processing
    if (!this.worker) {
      return this.fallbackProcessing(type, payload);
    }

    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const task: WorkerTask = { id, type, payload, resolve, reject };
      
      this.taskQueue.set(id, task);
      
      // Set timeout for task completion
      setTimeout(() => {
        if (this.taskQueue.has(id)) {
          this.taskQueue.delete(id);
          reject(new Error('Task timeout'));
        }
      }, 30000); // 30 second timeout

      this.worker!.postMessage({ type, payload, id });
    });
  }

  // Fallback processing for when Web Workers are not available
  private async fallbackProcessing(type: string, payload: any): Promise<any> {
    // Import processing functions dynamically to avoid blocking main thread
    const { processOnMainThread } = await import('./mainThreadProcessor');
    return processOnMainThread(type, payload);
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.taskQueue.clear();
    this.isInitialized = false;
  }
}

// Singleton instance
export const workerManager = new WebWorkerManager();

// Convenience functions for common operations
export async function parseSensorDataAsync(data: any[], format: string = 'pmscan') {
  return workerManager.runTask('PARSE_SENSOR_DATA', { data, format });
}

export async function calculateStatisticsAsync(measurements: any[], field: string) {
  return workerManager.runTask('CALCULATE_STATISTICS', { measurements, field });
}

export async function aggregateChartDataAsync(
  measurements: any[], 
  timeInterval: string, 
  fields: string[]
) {
  return workerManager.runTask('AGGREGATE_CHART_DATA', { 
    measurements, 
    timeInterval, 
    fields 
  });
}

export async function processMissionDataAsync(missions: any[], groupBy: string) {
  return workerManager.runTask('PROCESS_MISSION_DATA', { missions, groupBy });
}

export async function calculateWHOComplianceAsync(measurements: any[]) {
  return workerManager.runTask('CALCULATE_WHO_COMPLIANCE', { measurements });
}