import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// Generic skeleton components
const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn("rounded-lg border bg-card p-4 space-y-3", className)}>
    <Skeleton className="h-5 w-1/2" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/3" />
  </div>
);

const SkeletonStats = ({ className }: { className?: string }) => (
  <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
    {[...Array(4)].map((_, i) => (
      <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
    ))}
  </div>
);

// Air Quality Cards Skeleton
const AirQualityCardsSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
    {[...Array(3)].map((_, i) => (
      <div key={i} className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    ))}
  </div>
);

// Real-time page skeleton - DEFAULT EXPORT
export default function RealTimePageSkeleton() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats Cards */}
      <SkeletonStats />

      {/* Air Quality Cards */}
      <AirQualityCardsSkeleton />

      {/* Map/Chart Area */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Additional Content */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

// Export individual components for flexibility
export { SkeletonCard, SkeletonStats, AirQualityCardsSkeleton };