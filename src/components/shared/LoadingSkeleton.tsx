import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonCard } from './SkeletonScreens';
import HistoryPageSkeleton from './HistoryPageSkeleton';
import AnalysisPageSkeleton from './AnalysisPageSkeleton';
import GroupsPageSkeleton from './GroupsPageSkeleton';
import ProfilePageSkeleton from './ProfilePageSkeleton';
import AppLayoutSkeleton from './AppLayoutSkeleton';

interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'grid' | 'realtime' | 'history' | 'analysis' | 'groups' | 'profile' | 'layout';
  count?: number;
  className?: string;
}

export default function LoadingSkeleton({ 
  variant = 'card',
  count = 3,
  className 
}: LoadingSkeletonProps) {
  switch (variant) {
    case 'realtime':
      return (
        <div className="container mx-auto p-4 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      );
    case 'history':
      return <HistoryPageSkeleton />;
    case 'analysis':
      return <AnalysisPageSkeleton />;
    case 'groups':
      return <GroupsPageSkeleton />;
    case 'profile':
      return <ProfilePageSkeleton />;
    case 'layout':
      return <AppLayoutSkeleton />;
    case 'list':
      return (
        <div className={cn("space-y-3", className)}>
          {[...Array(count)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      );
    case 'grid':
      return (
        <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
          {[...Array(count)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
    case 'card':
    default:
      return <SkeletonCard className={className} />;
  }
}