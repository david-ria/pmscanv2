import LoadingCard from './LoadingCard';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';

interface DataWrapperProps {
  children: React.ReactNode;
  isLoading: boolean;
  error?: string | null;
  isEmpty?: boolean;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  onRetry?: () => void;
}

export default function DataWrapper({
  children,
  isLoading,
  error,
  isEmpty = false,
  loadingComponent,
  errorComponent,
  emptyComponent,
  onRetry
}: DataWrapperProps) {
  if (isLoading) {
    return loadingComponent || <LoadingCard />;
  }

  if (error) {
    return errorComponent || (
      <ErrorState 
        description={error} 
        onRetry={onRetry}
      />
    );
  }

  if (isEmpty) {
    return emptyComponent || (
      <EmptyState 
        title="No data available" 
        description="There's no data to display at the moment."
      />
    );
  }

  return <>{children}</>;
}