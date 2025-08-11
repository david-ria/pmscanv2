import { ReactNode, Suspense, lazy, useEffect } from 'react';
import { useGitHubSyncRecovery } from '@/hooks/useGitHubSyncRecovery';
import * as logger from '@/utils/logger';

// Lazy load heavy context providers
const AuthProvider = lazy(() => 
  import('@/contexts/AuthContext').then(module => ({ default: module.AuthProvider }))
);
const ThresholdProvider = lazy(() => 
  import('@/contexts/ThresholdContext').then(module => ({ default: module.ThresholdProvider }))
);
const AlertProvider = lazy(() => 
  import('@/contexts/AlertContext').then(module => ({ default: module.AlertProvider }))
);

interface AppProvidersProps {
  children: ReactNode;
}

function AppProvidersCore({ children }: AppProvidersProps) {
  console.log('🔧 AppProvidersCore starting...');
  const { syncState, isRecovering } = useGitHubSyncRecovery();

  useEffect(() => {
    logger.info('🚀 AppProviders initializing...');
    console.log('🔧 AppProviders sync state:', syncState);
    if (syncState === 'recovered') {
      logger.info('✅ GitHub sync recovery completed, app should be functional');
    }
  }, [syncState]);

  // Don't show recovery screen - it causes infinite loops
  // Just let the app load normally
  console.log('🔧 AppProviders rendering with sync state:', syncState);

  return (
    <Suspense fallback={<div className="min-h-screen bg-background animate-pulse" />}>
      <AuthProvider>
        <Suspense fallback={<div className="min-h-screen bg-background animate-pulse" />}>
          <ThresholdProvider>
            <Suspense fallback={<div className="min-h-screen bg-background animate-pulse" />}>
              <AlertProvider>
                {children}
              </AlertProvider>
            </Suspense>
          </ThresholdProvider>
        </Suspense>
      </AuthProvider>
    </Suspense>
  );
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background animate-pulse" />}>
      <AppProvidersCore>
        {children}
      </AppProvidersCore>
    </Suspense>
  );
}