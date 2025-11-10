import { useContext } from 'react';
import { ScopedRecordingContext } from '@/contexts/ScopedRecordingContext';

export function useScopedRecordingContext() {
  const ctx = useContext(ScopedRecordingContext);
  if (!ctx) {
    throw new Error('useScopedRecordingContext must be used within ScopedRecordingProvider');
  }
  return ctx;
}

