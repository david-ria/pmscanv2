import { useContext } from 'react';
import { ScopedRecordingContext } from '@/contexts/ScopedRecordingContext';
import * as logger from '@/utils/logger';

export function useScopedRecordingContext() {
  const ctx = useContext(ScopedRecordingContext);
  if (!ctx) {
    logger.error('useScopedRecordingContext must be used within ScopedRecordingProvider');
    throw new Error('useScopedRecordingContext must be used within ScopedRecordingProvider');
  }
  return ctx;
}
