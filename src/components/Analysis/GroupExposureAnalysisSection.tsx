import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ContextTypeSelector, type ContextType } from './ContextTypeSelector';
import { ExposureBarChart } from './ExposureBarChart';
import { ExposureDetailsTable } from './ExposureDetailsTable';
import { useExposureAnalysisData } from './useExposureAnalysisData';
import { useGroupMissions } from './useGroupMissions';
import { Skeleton } from '@/components/ui/skeleton';
import type { PollutantType } from './PollutantSelector';

interface GroupExposureAnalysisSectionProps {
  selectedPeriod: 'day' | 'week' | 'month' | 'year';
  selectedDate: Date;
  pollutantType: PollutantType;
}

export const GroupExposureAnalysisSection = ({
  selectedPeriod,
  selectedDate,
  pollutantType,
}: GroupExposureAnalysisSectionProps) => {
  const { t } = useTranslation();
  const [contextType, setContextType] = useState<ContextType>('location');
  
  const { missions, loading } = useGroupMissions(selectedDate, selectedPeriod);

  const data = useExposureAnalysisData(
    missions,
    selectedPeriod,
    selectedDate,
    contextType,
    pollutantType
  );

  if (loading) {
    return (
      <div className="mt-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full max-w-md mx-auto" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Skeleton className="lg:col-span-3 h-72" />
          <Skeleton className="lg:col-span-2 h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        {t('analysis.exposureAnalysis.title')}
      </h2>

      <ContextTypeSelector value={contextType} onChange={setContextType} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <ExposureBarChart data={data} pollutantType={pollutantType} />
        </div>
        <div className="lg:col-span-2">
          <ExposureDetailsTable data={data} pollutantType={pollutantType} />
        </div>
      </div>
    </div>
  );
};
