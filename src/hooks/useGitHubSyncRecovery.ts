import { useEffect, useState } from 'react';
import * as logger from '@/utils/logger';

/**
 * Hook to detect and recover from GitHub sync corruption
 * This happens when GitHub codespace is deleted but Lovable still has stale sync state
 */
export function useGitHubSyncRecovery() {
  const [syncState, setSyncState] = useState<'checking' | 'healthy' | 'corrupted' | 'recovered'>('healthy'); // Default to healthy

  useEffect(() => {
    // Only run once on mount
    let hasRun = false;
    
    const checkGitHubSyncHealth = async () => {
      if (hasRun) return; // Prevent multiple runs
      hasRun = true;
      
      try {
        console.log('🔍 Checking GitHub sync health...');
        
        // Simple check - only look for obvious corruption markers
        const hasCorruption = localStorage.getItem('github_sync_corrupted') === 'true';
        
        if (hasCorruption) {
          console.log('🚨 Detected corrupted GitHub sync state');
          await recoverFromCorruptedSync();
          setSyncState('recovered');
        } else {
          console.log('✅ GitHub sync state appears healthy');
          setSyncState('healthy');
        }
      } catch (error) {
        console.error('Failed to check GitHub sync health:', error);
        setSyncState('healthy'); // Fail safe - assume healthy
      }
    };

    // Run check after a short delay to avoid blocking initial render
    const timeoutId = setTimeout(checkGitHubSyncHealth, 100);
    return () => clearTimeout(timeoutId);
  }, []); // Empty dependency array - run only once

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
    isRecovering: false, // Never block the app
  };
}