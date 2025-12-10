import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MissionData } from '@/lib/dataStorage';
import { ContextTypeSelector, type ContextType } from './ContextTypeSelector';
import { ExposureBarChart } from './ExposureBarChart';
import { ExposureDetailsTable } from './ExposureDetailsTable';
import { useExposureAnalysisData } from './useExposureAnalysisData';
import type { PollutantType } from './PollutantSelector';

interface ExposureAnalysisSectionProps {
  missions: MissionData[];
  selectedPeriod: 'day' | 'week' | 'month' | 'year';
  selectedDate: Date;
  pollutantType: PollutantType;
}

export const ExposureAnalysisSection = ({
  missions,
  selectedPeriod,
  selectedDate,
  pollutantType,
}: ExposureAnalysisSectionProps) => {
  const { t } = useTranslation();
  const [contextType, setContextType] = useState<ContextType>('location');

  const data = useExposureAnalysisData(
    missions,
    selectedPeriod,
    selectedDate,
    contextType,
    pollutantType
  );

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
