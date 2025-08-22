import { cn } from '@/lib/utils';
import LoadingSpinner from './LoadingSpinner';

interface LoadingCardProps {
  title?: string;
  description?: string;
  className?: string;
}

export default function LoadingCard({ title = 'Loading...', description, className }: LoadingCardProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-8 px-4", className)}>
      <LoadingSpinner size="lg" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 text-center text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}