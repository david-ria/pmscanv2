import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonCard, SkeletonStats } from './SkeletonScreens';

export default function AnalysisPageSkeleton() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Summary Stats */}
      <SkeletonStats />

      {/* Analysis Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Statistical Analysis */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <SkeletonCard />
        </div>

        {/* Charts */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <Skeleton className="h-64 w-full" />
            <div className="flex justify-center gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Analysis */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>

      {/* Export Options */}
      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  );
}