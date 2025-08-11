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
  const { syncState, isRecovering } = useGitHubSyncRecovery();

  useEffect(() => {
    logger.info('🚀 AppProviders initializing...');
    if (syncState === 'recovered') {
      logger.info('✅ GitHub sync recovery completed, app should be functional');
    }
  }, [syncState]);

  // Show recovery screen while fixing GitHub sync issues
  if (isRecovering) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 bg-primary rounded animate-spin mx-auto" />
          <p className="text-muted-foreground">Initializing application...</p>
        </div>
      </div>
    );
  }

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