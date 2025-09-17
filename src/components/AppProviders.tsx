import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThresholdProvider } from '@/contexts/ThresholdContext';
import { AlertProvider } from '@/contexts/AlertContext';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <ThresholdProvider>
        <AlertProvider>
          {children}
        </AlertProvider>
      </ThresholdProvider>
    </AuthProvider>
  );
}