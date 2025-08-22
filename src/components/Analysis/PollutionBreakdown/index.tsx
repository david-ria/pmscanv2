
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { MissionData } from '@/lib/dataStorage';
import { PMTypeSelector } from './PMTypeSelector';
import { BreakdownTypeSelector } from './BreakdownTypeSelector';
import { PollutionPieChart } from './PollutionPieChart';
import { PollutionSummaryTable } from './PollutionSummaryTable';
import { usePollutionBreakdownData, type BreakdownData } from './usePollutionBreakdownData';
import { getWHOThreshold } from './utils';

interface PollutionBreakdownChartProps {
  missions: MissionData[];
  selectedPeriod: 'day' | 'week' | 'month' | 'year';
  selectedDate: Date;
  onBreakdownDataChange?: (data: {
    breakdownData: BreakdownData[];
    pmType: PMType;
    breakdownType: BreakdownType;
  }) => void;
}

type BreakdownType = 'location' | 'activity' | 'autocontext';
type PMType = 'pm1' | 'pm25' | 'pm10';

export const PollutionBreakdownChart = ({
  missions,
  selectedPeriod,
  selectedDate,
  onBreakdownDataChange,
}: PollutionBreakdownChartProps) => {
  const { t } = useTranslation();
  const [breakdownType, setBreakdownType] = useState<BreakdownType>('activity');
  const [pmType, setPmType] = useState<PMType>('pm25');

  const breakdownData = usePollutionBreakdownData(
    missions,
    selectedPeriod,
    selectedDate,
    breakdownType,
    pmType
  );

  const whoThreshold = getWHOThreshold(pmType, selectedPeriod, t);

  // Notify parent component of breakdown data changes
  useEffect(() => {
    if (onBreakdownDataChange) {
      onBreakdownDataChange({
        breakdownData,
        pmType,
        breakdownType,
      });
    }
  }, [breakdownData, pmType, breakdownType, onBreakdownDataChange]);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4 sm:pb-6">
        <CardTitle className="text-lg mb-3">
          {t('analysis.dataAnalysis')}
        </CardTitle>
        <p className="text-sm text-muted-foreground mb-4 sm:mb-8">
          {t('analysis.chartExplanation')}
        </p>

        <div className="space-y-4">
          <PMTypeSelector pmType={pmType} onPMTypeChange={setPmType} />
          <BreakdownTypeSelector
            breakdownType={breakdownType}
            onBreakdownTypeChange={setBreakdownType}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Mobile-first layout */}
        <div className="space-y-6 lg:hidden">
          {/* Pie Chart - Full width on mobile */}
          <div className="w-full">
            <div className="h-64 sm:h-80 w-full">
              <PollutionPieChart breakdownData={breakdownData} pmType={pmType} />
            </div>
          </div>

          {/* Summary Table - Full width on mobile */}
          <div className="w-full">
            <div className="flex flex-col gap-2 mb-3">
              <h4 className="font-medium text-sm text-muted-foreground">
                {t('analysis.detailedSummary')}
              </h4>
              <div className="text-xs text-muted-foreground">
                {whoThreshold.label}
              </div>
            </div>
            <PollutionSummaryTable
              breakdownData={breakdownData}
              pmType={pmType}
              whoThreshold={whoThreshold}
            />
          </div>
        </div>

        {/* Desktop layout - side by side */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="h-80">
              <PollutionPieChart breakdownData={breakdownData} pmType={pmType} />
            </div>

            {/* Summary Table */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  {t('analysis.detailedSummary')}
                </h4>
                <div className="text-xs text-muted-foreground">
                  {whoThreshold.label}
                </div>
              </div>
              <PollutionSummaryTable
                breakdownData={breakdownData}
                pmType={pmType}
                whoThreshold={whoThreshold}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
