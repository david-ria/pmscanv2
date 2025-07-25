import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Generic skeleton components
export const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn("rounded-lg border bg-card p-4 space-y-3", className)}>
    <Skeleton className="h-4 w-[200px]" />
    <Skeleton className="h-3 w-[150px]" />
    <Skeleton className="h-8 w-full" />
  </div>
);

export const SkeletonStats = ({ className }: { className?: string }) => (
  <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
        <Skeleton className="h-3 w-[80px]" />
        <Skeleton className="h-6 w-[60px]" />
        <Skeleton className="h-2 w-full" />
      </div>
    ))}
  </div>
);

// Air Quality Cards Skeleton
export const AirQualityCardsSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-[60px]" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <Skeleton className="h-8 w-[80px]" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-3 w-[100px]" />
      </div>
    ))}
  </div>
);

// Real-time page skeleton
export const RealTimePageSkeleton = () => (
  <div className="container mx-auto p-4 space-y-6">
    {/* Header area */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-[200px]" />
      <Skeleton className="h-9 w-[100px]" />
    </div>
    
    {/* Air quality cards */}
    <AirQualityCardsSkeleton />
    
    {/* Map/Graph toggle area */}
    <div className="space-y-4">
      <div className="flex justify-center">
        <Skeleton className="h-10 w-[200px] rounded-full" />
      </div>
      <Skeleton className="h-[300px] w-full rounded-lg" />
    </div>
    
    {/* Controls */}
    <div className="flex justify-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <Skeleton className="h-12 w-[120px] rounded-lg" />
    </div>
  </div>
);

// History page skeleton
export const HistoryPageSkeleton = () => (
  <div className="container mx-auto p-4 space-y-6">
    {/* Header with filters */}
    <div className="space-y-4">
      <Skeleton className="h-6 w-[150px]" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-[120px]" />
        <Skeleton className="h-10 w-[120px]" />
        <Skeleton className="h-10 w-[80px]" />
      </div>
    </div>
    
    {/* Mission cards */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-4 w-[80px]" />
          </div>
          <Skeleton className="h-3 w-[100px]" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-[60px]" />
            <Skeleton className="h-6 w-[60px]" />
          </div>
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  </div>
);

// Analysis page skeleton
export const AnalysisPageSkeleton = () => (
  <div className="container mx-auto p-4 space-y-6">
    {/* Header */}
    <div className="space-y-4">
      <Skeleton className="h-6 w-[180px]" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-[150px]" />
        <Skeleton className="h-10 w-[100px]" />
      </div>
    </div>
    
    {/* Stats overview */}
    <SkeletonStats />
    
    {/* Charts area */}
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <Skeleton className="h-5 w-[140px]" />
        <Skeleton className="h-[250px] w-full rounded-lg" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-5 w-[120px]" />
        <Skeleton className="h-[250px] w-full rounded-lg" />
      </div>
    </div>
    
    {/* Data table */}
    <div className="space-y-4">
      <Skeleton className="h-5 w-[100px]" />
      <div className="rounded-lg border">
        <div className="grid grid-cols-4 gap-4 p-4 border-b">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, row) => (
          <div key={row} className="grid grid-cols-4 gap-4 p-4 border-b last:border-b-0">
            {Array.from({ length: 4 }).map((_, col) => (
              <Skeleton key={col} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Groups page skeleton
export const GroupsPageSkeleton = () => (
  <div className="container mx-auto p-4 space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-[120px]" />
      <Skeleton className="h-10 w-[100px]" />
    </div>
    
    {/* Groups grid */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-[140px]" />
            <Skeleton className="h-4 w-4" />
          </div>
          <Skeleton className="h-3 w-[200px]" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-3 w-[80px]" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-[70px]" />
            <Skeleton className="h-8 w-[70px]" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Profile page skeleton
export const ProfilePageSkeleton = () => (
  <div className="container mx-auto p-4 space-y-6">
    {/* Profile header */}
    <div className="flex items-center space-x-4">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-[150px]" />
        <Skeleton className="h-3 w-[200px]" />
      </div>
    </div>
    
    {/* Settings sections */}
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4 space-y-4">
          <Skeleton className="h-5 w-[120px]" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between">
                <Skeleton className="h-4 w-[160px]" />
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// App-wide layout skeleton
export const AppLayoutSkeleton = () => (
  <div className="min-h-screen bg-background">
    {/* Header skeleton */}
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <Skeleton className="h-6 w-[120px]" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
    
    {/* Main content */}
    <main className="pt-14 pb-16">
      <RealTimePageSkeleton />
    </main>
    
    {/* Bottom navigation skeleton */}
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-around px-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center space-y-1">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-2 w-8" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Generic loading container
export const LoadingSkeleton = ({ 
  variant = 'card',
  className 
}: { 
  variant?: 'card' | 'list' | 'grid' | 'table';
  className?: string;
}) => {
  switch (variant) {
    case 'list':
      return (
        <div className={cn("space-y-3", className)}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-[200px]" />
                <Skeleton className="h-2 w-[150px]" />
              </div>
            </div>
          ))}
        </div>
      );
    
    case 'grid':
      return (
        <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
    
    case 'table':
      return (
        <div className={cn("rounded-lg border", className)}>
          <div className="grid grid-cols-3 gap-4 p-4 border-b">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, row) => (
            <div key={row} className="grid grid-cols-3 gap-4 p-4 border-b last:border-b-0">
              {Array.from({ length: 3 }).map((_, col) => (
                <Skeleton key={col} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      );
    
    default:
      return <SkeletonCard className={className} />;
  }
};