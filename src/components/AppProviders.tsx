import { ReactNode, Suspense, lazy } from 'react';

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

export function AppProviders({ children }: AppProvidersProps) {
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