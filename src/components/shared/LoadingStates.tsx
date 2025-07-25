import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  useSkeleton?: boolean;
}

export const LoadingSpinner = ({ 
  size = 'md', 
  text, 
  className,
  useSkeleton = false 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  if (useSkeleton) {
    return (
      <div className={cn("flex items-center justify-center gap-2", className)}>
        <Skeleton className={cn("rounded-full", sizeClasses[size])} />
        {text && <Skeleton className="h-4 w-20" />}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
};

interface LoadingCardProps {
  title?: string;
  description?: string;
  className?: string;
}

export const LoadingCard = ({ title = 'Loading...', description, className }: LoadingCardProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-8 px-4", className)}>
      <LoadingSpinner size="lg" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 text-center text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}

export const ErrorState = ({ 
  title = 'Something went wrong', 
  description, 
  onRetry, 
  retryText = 'Try again',
  className 
}: ErrorStateProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-8 px-4", className)}>
      <AlertCircle className="h-8 w-8 text-destructive mb-4" />
      <h3 className="text-lg font-semibold text-center">{title}</h3>
      {description && (
        <p className="mt-2 text-center text-sm text-muted-foreground">{description}</p>
      )}
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          {retryText}
        </Button>
      )}
    </div>
  );
};

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({ title, description, action, icon, className }: EmptyStateProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-8 px-4", className)}>
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-semibold text-center">{title}</h3>
      {description && (
        <p className="mt-2 text-center text-sm text-muted-foreground">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
};

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

export const DataWrapper = ({
  children,
  isLoading,
  error,
  isEmpty = false,
  loadingComponent,
  errorComponent,
  emptyComponent,
  onRetry
}: DataWrapperProps) => {
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
};