import { lazy, memo } from 'react';
import { LazyWrapper } from '@/components/shared/LazyWrapper';

const LazyStatisticalAnalysisComponent = lazy(() => 
  import('./StatisticalAnalysis').then(module => ({
    default: module.StatisticalAnalysis
  }))
);

interface LazyStatisticalAnalysisProps {
  statisticalAnalysis: any;
  loading: boolean;
  onRegenerate: () => void;
  selectedPeriod: 'day' | 'week' | 'month' | 'year';
  selectedDate: Date;
  breakdownData: any[];
  pmType: 'pm1' | 'pm25' | 'pm10';
  breakdownType: string;
}

export const LazyStatisticalAnalysis = memo(({
  statisticalAnalysis,
  loading,
  onRegenerate,
  selectedPeriod,
  selectedDate,
  breakdownData,
  pmType,
  breakdownType,
}: LazyStatisticalAnalysisProps) => {
  return (
    <LazyWrapper
      fallback={
        <div className="h-64 bg-card rounded-lg border animate-pulse">
          <div className="p-6 space-y-4">
            <div className="h-6 bg-muted rounded w-1/4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </div>
      }
    >
      <LazyStatisticalAnalysisComponent
        statisticalAnalysis={statisticalAnalysis}
        loading={loading}
        onRegenerate={onRegenerate}
        selectedPeriod={selectedPeriod}
        selectedDate={selectedDate}
        breakdownData={breakdownData}
        pmType={pmType}
        breakdownType={breakdownType}
      />
    </LazyWrapper>
  );
});

LazyStatisticalAnalysis.displayName = 'LazyStatisticalAnalysis';