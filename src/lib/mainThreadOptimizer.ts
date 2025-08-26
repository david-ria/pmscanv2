// Main Thread Optimizer - Reduces Total Blocking Time (TBT)
// Schedules heavy tasks to avoid blocking the main thread

interface TaskOptions {
  priority: 'background' | 'user-blocking' | 'user-visible';
  timeout?: number;
  signal?: AbortSignal;
}

class MainThreadOptimizer {
  private taskQueue: Array<{
    task: () => Promise<any> | any;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    options: TaskOptions;
  }> = [];
  
  private isProcessing = false;

  /**
   * Schedule a task to run when the main thread is idle
   */
  async scheduleTask<T>(
    task: () => Promise<T> | T,
    options: TaskOptions = { priority: 'background' }
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ task, resolve, reject, options });
      
      if (!this.isProcessing) {
        this.processTasks();
      }
    });
  }

  private async processTasks() {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.taskQueue.length > 0) {
      const { task, resolve, reject, options } = this.taskQueue.shift()!;

      try {
        // Check if task was aborted
        if (options.signal?.aborted) {
          reject(new Error('Task aborted'));
          continue;
        }

        // Schedule task based on priority
        const result = await this.executeWithScheduling(task, options);
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Yield to main thread between tasks
      await this.yieldToMain();
    }

    this.isProcessing = false;
  }

  private async executeWithScheduling<T>(
    task: () => Promise<T> | T,
    options: TaskOptions
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const executeTask = async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      // Use Scheduler API if available
      if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
        (window as any).scheduler.postTask(executeTask, {
          priority: options.priority,
          signal: options.signal
        });
      }
      // Fallback to requestIdleCallback for background tasks
      else if (options.priority === 'background' && 'requestIdleCallback' in window) {
        requestIdleCallback(executeTask, {
          timeout: options.timeout || 5000
        });
      }
      // Fallback to setTimeout for urgent tasks
      else {
        const delay = options.priority === 'user-blocking' ? 0 : 
                     options.priority === 'user-visible' ? 16 : 100;
        setTimeout(executeTask, delay);
      }
    });
  }

  private async yieldToMain(): Promise<void> {
    return new Promise(resolve => {
      if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
        (window as any).scheduler.postTask(resolve, { priority: 'user-blocking' });
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  /**
   * Break large arrays into chunks and process them without blocking
   */
  async processArrayInChunks<T, R>(
    array: T[],
    processor: (chunk: T[]) => R[],
    chunkSize: number = 100,
    options: TaskOptions = { priority: 'background' }
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < array.length; i += chunkSize) {
      const chunk = array.slice(i, i + chunkSize);
      
      const chunkResult = await this.scheduleTask(
        () => processor(chunk),
        options
      );
      
      results.push(...chunkResult);
    }
    
    return results;
  }

  /**
   * Defer script execution until idle
   */
  async deferScript(scriptUrl: string): Promise<void> {
    return this.scheduleTask(
      () => new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${scriptUrl}`));
        
        // Load script with low priority
        if ('fetchPriority' in script) {
          (script as any).fetchPriority = 'low';
        }
        
        document.head.appendChild(script);
      }),
      { priority: 'background', timeout: 10000 }
    );
  }

  /**
   * Clear pending tasks
   */
  clearTasks() {
    this.taskQueue.length = 0;
  }
}

// Global optimizer instance
export const mainThreadOptimizer = new MainThreadOptimizer();

// Convenience functions
export async function scheduleBackgroundTask<T>(task: () => Promise<T> | T): Promise<T> {
  return mainThreadOptimizer.scheduleTask(task, { priority: 'background' });
}

export async function scheduleUserTask<T>(task: () => Promise<T> | T): Promise<T> {
  return mainThreadOptimizer.scheduleTask(task, { priority: 'user-visible' });
}

export async function scheduleUrgentTask<T>(task: () => Promise<T> | T): Promise<T> {
  return mainThreadOptimizer.scheduleTask(task, { priority: 'user-blocking' });
}

/**
 * Optimize heavy computations by breaking them into chunks
 */
export async function optimizeComputation<T>(
  computation: () => T,
  options: { 
    maxExecutionTime?: number; 
    priority?: TaskOptions['priority'] 
  } = {}
): Promise<T> {
  const { maxExecutionTime = 5, priority = 'background' } = options;
  
  return mainThreadOptimizer.scheduleTask(
    async () => {
      const startTime = performance.now();
      let result = computation();
      
      // If computation takes too long, yield and continue
      if (performance.now() - startTime > maxExecutionTime) {
        await mainThreadOptimizer['yieldToMain']();
      }
      
      return result;
    },
    { priority }
  );
}

console.debug('[PERF] 🚀 Main Thread Optimizer initialized');