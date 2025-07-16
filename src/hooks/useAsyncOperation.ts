import { useState, useCallback } from 'react';
import { AsyncOperationState } from '@/types/shared';
import { useNotifications } from './useNotifications';

/**
 * Standardized async operation state management
 * Consolidates loading, error, and success states
 */
export const useAsyncOperation = <T = any>() => {
  const [state, setState] = useState<AsyncOperationState>({
    isLoading: false,
    error: null,
    isSuccess: false,
    data: null
  });

  const { notifyError } = useNotifications();

  const execute = useCallback(async (
    operation: () => Promise<T>,
    {
      onSuccess,
      onError,
      showErrorNotification = true,
      successMessage
    }: {
      onSuccess?: (data: T) => void;
      onError?: (error: string) => void;
      showErrorNotification?: boolean;
      successMessage?: string;
    } = {}
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null, isSuccess: false }));
    
    try {
      const data = await operation();
      setState({
        isLoading: false,
        error: null,
        isSuccess: true,
        data
      });
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      setState({
        isLoading: false,
        error: errorMessage,
        isSuccess: false,
        data: null
      });
      
      if (showErrorNotification) {
        notifyError('Operation Failed', errorMessage);
      }
      
      if (onError) {
        onError(errorMessage);
      }
      
      throw error;
    }
  }, [notifyError]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      isSuccess: false,
      data: null
    });
  }, []);

  return {
    ...state,
    execute,
    reset
  };
};