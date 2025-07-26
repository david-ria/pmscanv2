import { useState, useEffect } from 'react';
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
  onBreakdownDataChange?: (data: {
    breakdownData: any[];
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
            
            {/* Formula explanation */}
            <div className="bg-muted/20 p-3 rounded-lg border-l-4 border-primary/30">
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="font-medium text-foreground">
                  💡 {t('analysis.doseCalculation.title')}
                </div>
                <div>
                  <strong>{t('analysis.doseCalculation.formula')}:</strong> Dose inhalée (µg) = Concentration × Temps × Débit respiratoire
                </div>
                <div>
                  • <strong>Concentration:</strong> PM{pmType.replace('pm', '')} en µg/m³
                </div>
                <div>
                  • <strong>Temps:</strong> Durée d'exposition en heures
                </div>
                <div>
                  • <strong>Débit respiratoire:</strong> Variable selon l'activité (0.4-3.5 m³/h)
                </div>
                <div className="text-xs opacity-75 mt-1">
                  {t('analysis.doseCalculation.explanation')}
                </div>
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
