import { ReactNode } from 'react';

// ✅ Import synchronously - critical for recording stability during state changes
// (login/logout, threshold modifications, alert settings, etc.)
import { AuthProvider } from '@/contexts/AuthContext';
import { ThresholdProvider } from '@/contexts/ThresholdContext';
import { AlertProvider } from '@/contexts/AlertContext';
import { ScopedRecordingProvider } from '@/contexts/ScopedRecordingContext';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <ScopedRecordingProvider>
        <ThresholdProvider>
          <AlertProvider>
            {children}
          </AlertProvider>
        </ThresholdProvider>
      </ScopedRecordingProvider>
    </AuthProvider>
  );
}
