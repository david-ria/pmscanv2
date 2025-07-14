import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { MissionData } from '@/lib/dataStorage';
import { PMTypeSelector } from './PMTypeSelector';
import { BreakdownTypeSelector } from './BreakdownTypeSelector';
import { PollutionPieChart } from './PollutionPieChart';
import { PollutionSummaryTable } from './PollutionSummaryTable';
import { usePollutionBreakdownData } from './usePollutionBreakdownData';
import { getWHOThreshold } from './utils';

interface PollutionBreakdownChartProps {
  missions: MissionData[];
  selectedPeriod: 'day' | 'week' | 'month' | 'year';
  selectedDate: Date;
}

type BreakdownType = 'location' | 'activity' | 'autocontext';
type PMType = 'pm1' | 'pm25' | 'pm10';

export const PollutionBreakdownChart = ({
  missions,
  selectedPeriod,
  selectedDate,
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

  return (
    <Card className="mb-6">
      <CardHeader className="pb-6">
        <CardTitle className="text-lg mb-3">
          {t('analysis.dataAnalysis')}
        </CardTitle>
        <p className="text-sm text-muted-foreground mb-8">
          {t('analysis.chartExplanation')}
        </p>

        <PMTypeSelector pmType={pmType} onPMTypeChange={setPmType} />
        <BreakdownTypeSelector
          breakdownType={breakdownType}
          onBreakdownTypeChange={setBreakdownType}
        />
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Chart area */}
        <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
          {/* Pie Chart */}
          <div className="h-64 sm:h-80">
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
      </CardContent>
    </Card>
  );
};
