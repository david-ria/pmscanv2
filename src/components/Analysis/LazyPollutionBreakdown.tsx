import { lazy, memo } from 'react';
import { LazyWrapper } from '@/components/shared/LazyWrapper';

// Lazy load the heavy chart components
const LazyPollutionBreakdownChart = lazy(() => 
  import('./PollutionBreakdown/index').then(module => ({
    default: module.PollutionBreakdownChart
  }))
);

interface LazyPollutionBreakdownProps {
  missions: any[];
  selectedPeriod: 'day' | 'week' | 'month' | 'year';
  selectedDate: Date;
  onBreakdownDataChange?: (data: any) => void;
}

export const LazyPollutionBreakdown = memo(({
  missions,
  selectedPeriod,
  selectedDate,
  onBreakdownDataChange,
}: LazyPollutionBreakdownProps) => {
  return (
    <LazyWrapper
      fallback={
        <div className="h-96 bg-card rounded-lg border animate-pulse">
          <div className="p-6 space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      }
    >
      <LazyPollutionBreakdownChart
        missions={missions}
        selectedPeriod={selectedPeriod}
        selectedDate={selectedDate}
        onBreakdownDataChange={onBreakdownDataChange}
      />
    </LazyWrapper>
  );
});

LazyPollutionBreakdown.displayName = 'LazyPollutionBreakdown';