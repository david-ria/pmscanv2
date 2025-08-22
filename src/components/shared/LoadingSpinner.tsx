import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  useSkeleton?: boolean;
}

export default function LoadingSpinner({ 
  size = 'md', 
  text, 
  className,
  useSkeleton = false 
}: LoadingSpinnerProps) {
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
}