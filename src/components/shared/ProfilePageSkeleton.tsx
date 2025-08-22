import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonCard } from './SkeletonScreens';

export default function ProfilePageSkeleton() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Profile Settings */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Information */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <SkeletonCard />
        </div>

        {/* Preferences */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <SkeletonCard />
        </div>
      </div>

      {/* Additional Settings */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}