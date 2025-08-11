import { useEffect, useState } from 'react';
import * as logger from '@/utils/logger';

/**
 * Hook to detect and recover from GitHub sync corruption
 * This happens when GitHub codespace is deleted but Lovable still has stale sync state
 */
export function useGitHubSyncRecovery() {
  const [syncState, setSyncState] = useState<'checking' | 'healthy' | 'corrupted' | 'recovered'>('checking');

  useEffect(() => {
    const checkGitHubSyncHealth = async () => {
      try {
        console.log('🔍 Checking GitHub sync health...');
        logger.debug('🔍 Checking GitHub sync health...');
        
        // Check for signs of corrupted GitHub sync state
        const hasStaleGitHubState = localStorage.getItem('github_sync_state') && 
                                   !localStorage.getItem('github_repo_accessible');
        
        const hasRepeatedSyncErrors = localStorage.getItem('github_sync_error_count') && 
                                     parseInt(localStorage.getItem('github_sync_error_count') || '0') > 3;

        if (hasStaleGitHubState || hasRepeatedSyncErrors) {
          logger.warn('🚨 Detected corrupted GitHub sync state');
          await recoverFromCorruptedSync();
          setSyncState('recovered');
        } else {
          logger.debug('✅ GitHub sync state appears healthy');
          setSyncState('healthy');
        }
      } catch (error) {
        logger.error('Failed to check GitHub sync health:', error);
        setSyncState('corrupted');
      }
    };

    checkGitHubSyncHealth();
  }, []);

  const recoverFromCorruptedSync = async () => {
    try {
      logger.info('🔧 Recovering from corrupted GitHub sync...');
      
      // Clear all GitHub-related cached state
      const githubKeys = Object.keys(localStorage).filter(key => 
        key.includes('github') || 
        key.includes('git') || 
        key.includes('sync')
      );
      
      githubKeys.forEach(key => {
        logger.debug(`Clearing corrupted sync key: ${key}`);
        localStorage.removeItem(key);
      });

      // Clear service worker cache if it exists (may contain stale GitHub data)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.includes('github') || cacheName.includes('sync')) {
              logger.debug(`Clearing cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      }

      // Reset any GitHub-related session storage
      const githubSessionKeys = Object.keys(sessionStorage).filter(key => 
        key.includes('github') || key.includes('sync')
      );
      
      githubSessionKeys.forEach(key => {
        logger.debug(`Clearing session key: ${key}`);
        sessionStorage.removeItem(key);
      });

      logger.info('✅ GitHub sync recovery completed');
      
      // Set a flag to indicate recovery was performed
      localStorage.setItem('github_sync_recovered', Date.now().toString());
      
    } catch (error) {
      logger.error('Failed to recover from corrupted GitHub sync:', error);
      throw error;
    }
  };

  return {
    syncState,
    recoverFromCorruptedSync,
    isRecovering: syncState === 'checking',
  };
}