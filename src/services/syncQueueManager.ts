import * as logger from '@/utils/logger';

interface QueueItem {
  id: string;
  data: any;
  type: 'csv' | 'mission' | 'data';
  timestamp: Date;
  retryCount: number;
  lastAttempt?: Date;
}

class SyncQueueManager {
  private static instance: SyncQueueManager;
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff

  static getInstance(): SyncQueueManager {
    if (!SyncQueueManager.instance) {
      SyncQueueManager.instance = new SyncQueueManager();
    }
    return SyncQueueManager.instance;
  }

  constructor() {
    this.loadQueueFromStorage();
    // Process queue every 30 seconds
    setInterval(() => this.processQueue(), 30000);
    
    // Listen for online status changes
    window.addEventListener('online', () => {
      logger.debug('🌐 Network back online, processing sync queue');
      this.processQueue();
    });
  }

  addToQueue(id: string, data: any, type: 'csv' | 'mission' | 'data'): void {
    const existingIndex = this.queue.findIndex(item => item.id === id);
    
    if (existingIndex >= 0) {
      // Update existing item
      this.queue[existingIndex] = {
        ...this.queue[existingIndex],
        data,
        timestamp: new Date()
      };
    } else {
      // Add new item
      this.queue.push({
        id,
        data,
        type,
        timestamp: new Date(),
        retryCount: 0
      });
    }

    this.saveQueueToStorage();
    
    // Try to process immediately if online
    if (navigator.onLine && !this.isProcessing) {
      this.processQueue();
    }
  }

  removeFromQueue(id: string): void {
    this.queue = this.queue.filter(item => item.id !== id);
    this.saveQueueToStorage();
  }

  getQueueStatus(): { total: number; failed: number; pending: number } {
    const failed = this.queue.filter(item => item.retryCount >= this.MAX_RETRIES).length;
    return {
      total: this.queue.length,
      failed,
      pending: this.queue.length - failed
    };
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    logger.debug('🔄 Processing sync queue:', this.queue.length, 'items');

    try {
      const itemsToProcess = this.queue.filter(item => {
        if (item.retryCount >= this.MAX_RETRIES) return false;
        
        // Check if enough time has passed for retry
        if (item.lastAttempt) {
          const delay = this.RETRY_DELAYS[Math.min(item.retryCount, this.RETRY_DELAYS.length - 1)];
          const timeSinceLastAttempt = Date.now() - item.lastAttempt.getTime();
          return timeSinceLastAttempt >= delay;
        }
        
        return true;
      });

      for (const item of itemsToProcess) {
        try {
          const success = await this.processItem(item);
          
          if (success) {
            this.removeFromQueue(item.id);
            logger.debug('✅ Successfully synced item:', item.id);
          } else {
            // Increment retry count
            item.retryCount++;
            item.lastAttempt = new Date();
            logger.warn('⚠️ Failed to sync item, will retry:', item.id, 'retry count:', item.retryCount);
          }
        } catch (error) {
          item.retryCount++;
          item.lastAttempt = new Date();
          logger.error(`❌ Error processing queue item: ${item.id}`);
        }
      }

      this.saveQueueToStorage();
    } finally {
      this.isProcessing = false;
    }
  }

  private async processItem(item: QueueItem): Promise<boolean> {
    switch (item.type) {
      case 'csv':
        return this.syncCSVData(item.data);
      case 'mission':
        return this.syncMissionData(item.data);
      case 'data':
        return this.syncGenericData(item.data);
      default:
        logger.warn('⚠️ Unknown queue item type:', item.type);
        return false;
    }
  }

  private async syncCSVData(data: any): Promise<boolean> {
    try {
      // This would integrate with your CSV sync logic
      // For now, we'll simulate the sync
      logger.debug('📄 Syncing CSV data...');
      
      // TODO: Implement actual CSV sync logic here
      // This might involve uploading to your server or external service
      
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return Math.random() > 0.3; // Simulate 70% success rate for testing
    } catch (error) {
      logger.error('❌ CSV sync failed:', new Error(String(error)));
      return false;
    }
  }

  private async syncMissionData(data: any): Promise<boolean> {
    try {
      logger.debug('🎯 Syncing mission data...', data.id);
      
      // TODO: Implement actual mission sync logic here
      // This would integrate with your existing mission sync
      
      await new Promise(resolve => setTimeout(resolve, 500));
      return Math.random() > 0.2; // Simulate 80% success rate
    } catch (error) {
      logger.error('❌ Mission sync failed:', new Error(String(error)));
      return false;
    }
  }

  private async syncGenericData(data: any): Promise<boolean> {
    try {
      logger.debug('📊 Syncing generic data...');
      
      // TODO: Implement generic data sync logic
      
      await new Promise(resolve => setTimeout(resolve, 300));
      return Math.random() > 0.1; // Simulate 90% success rate
    } catch (error) {
      logger.error('❌ Generic data sync failed:', new Error(String(error)));
      return false;
    }
  }

  private loadQueueFromStorage(): void {
    try {
      const stored = localStorage.getItem('sync-queue');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.queue = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
          lastAttempt: item.lastAttempt ? new Date(item.lastAttempt) : undefined
        }));
      }
    } catch (error) {
      logger.error('❌ Failed to load sync queue from storage:', new Error(String(error)));
      this.queue = [];
    }
  }

  private saveQueueToStorage(): void {
    try {
      localStorage.setItem('sync-queue', JSON.stringify(this.queue));
    } catch (error) {
      logger.error('❌ Failed to save sync queue to storage:', new Error(String(error)));
    }
  }

  // Public methods for manual control
  async retryItem(id: string): Promise<boolean> {
    const item = this.queue.find(item => item.id === id);
    if (!item) return false;

    try {
      const success = await this.processItem(item);
      if (success) {
        this.removeFromQueue(id);
      } else {
        item.retryCount++;
        item.lastAttempt = new Date();
        this.saveQueueToStorage();
      }
      return success;
    } catch (error) {
      logger.error(`❌ Failed to retry item: ${id}`);
      return false;
    }
  }

  clearFailedItems(): void {
    this.queue = this.queue.filter(item => item.retryCount < this.MAX_RETRIES);
    this.saveQueueToStorage();
  }

  clearAllItems(): void {
    this.queue = [];
    this.saveQueueToStorage();
  }
}

export const syncQueueManager = SyncQueueManager.getInstance();