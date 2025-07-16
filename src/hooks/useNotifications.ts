import { useToast } from './use-toast';

/**
 * Standardized notification patterns
 * Consolidates toast usage across the application
 */
export const useNotifications = () => {
  const { toast } = useToast();

  const notifySuccess = (message: string, description?: string) => {
    toast({
      title: message,
      description,
      variant: 'default'
    });
  };

  const notifyError = (message: string, description?: string) => {
    toast({
      title: message,
      description,
      variant: 'destructive'
    });
  };

  const notifyWarning = (message: string, description?: string) => {
    toast({
      title: message,
      description,
      variant: 'destructive' // Using destructive as warning variant
    });
  };

  const notifyInfo = (message: string, description?: string) => {
    toast({
      title: message,
      description,
      variant: 'default'
    });
  };

  // Common notification patterns
  const notifyOperationSuccess = (operation: string) => {
    notifySuccess(`${operation} successful`, `The ${operation.toLowerCase()} was completed successfully.`);
  };

  const notifyOperationError = (operation: string, error?: string) => {
    notifyError(
      `${operation} failed`, 
      error || `An error occurred while ${operation.toLowerCase()}. Please try again.`
    );
  };

  const notifyDataSaved = () => notifyOperationSuccess('Save');
  const notifyDataDeleted = () => notifyOperationSuccess('Delete');
  const notifyDataCreated = () => notifyOperationSuccess('Create');
  const notifyDataUpdated = () => notifyOperationSuccess('Update');

  const notifyValidationError = (field?: string) => {
    notifyError(
      'Validation Error',
      field ? `Please check the ${field} field.` : 'Please check all required fields.'
    );
  };

  const notifyNetworkError = () => {
    notifyError(
      'Network Error',
      'Please check your internet connection and try again.'
    );
  };

  return {
    // Base notifications
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
    
    // Operation notifications
    notifyOperationSuccess,
    notifyOperationError,
    
    // Common patterns
    notifyDataSaved,
    notifyDataDeleted,
    notifyDataCreated,
    notifyDataUpdated,
    notifyValidationError,
    notifyNetworkError
  };
};