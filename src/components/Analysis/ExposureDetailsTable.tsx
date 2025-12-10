import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { BreakdownData } from './PollutionBreakdown/usePollutionBreakdownData';
import type { PollutantType } from './PollutantSelector';

interface ExposureDetailsTableProps {
  data: BreakdownData[];
  pollutantType: PollutantType;
}

// WHO daily thresholds
const WHO_THRESHOLDS: Record<PollutantType, number> = {
  pm1: 10,    // Estimated, no official WHO guideline
  pm25: 15,   // WHO 2021 guideline
  pm10: 45,   // WHO 2021 guideline
  tvoc: 500,  // General indoor air quality guideline (ppb)
};

export const ExposureDetailsTable = ({ data, pollutantType }: ExposureDetailsTableProps) => {
  const { t } = useTranslation();

  const unit = pollutantType === 'tvoc' ? 'ppb' : 'µg/m³';
  const threshold = WHO_THRESHOLDS[pollutantType];

  const tableData = useMemo(() => {
    return data
      .sort((a, b) => b.cumulativeDose - a.cumulativeDose)
      .map((item) => {
        const isAboveWHO = item.avgPM > threshold;
        const hours = Math.floor(item.exposure / 60);
        const minutes = Math.round(item.exposure % 60);
        const timeFormatted = hours > 0 
          ? `${hours}h ${minutes}min` 
          : `${minutes} min`;

        return {
          ...item,
          timeFormatted,
          isAboveWHO,
        };
      });
  }, [data, threshold]);

  if (tableData.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {t('analysis.exposureAnalysis.detailsTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {tableData.map((item, index) => (
            <div 
              key={item.name} 
              className="p-3 flex items-start gap-3"
            >
              <div 
                className="w-3 h-3 rounded-full mt-1.5 shrink-0" 
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-foreground truncate">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.isAboveWHO ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                  <div>
                    <span className="opacity-70">{t('analysis.exposureAnalysis.timeSpent')}:</span>{' '}
                    <span className="text-foreground">{item.timeFormatted}</span>
                  </div>
                  <div>
                    <span className="opacity-70">{t('analysis.exposureAnalysis.average')}:</span>{' '}
                    <span className="text-foreground">{item.avgPM.toFixed(1)} {unit}</span>
                  </div>
                  <div>
                    <span className="opacity-70">{t('analysis.exposureAnalysis.exposure')}:</span>{' '}
                    <span className="text-foreground">{item.cumulativeDose.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="opacity-70">{t('analysis.exposureAnalysis.percentage')}:</span>{' '}
                    <span className="text-foreground">{item.percentage.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="mt-1 text-xs">
                  {item.isAboveWHO ? (
                    <span className="text-destructive">
                      {t('analysis.exposureAnalysis.aboveWHO', { threshold, unit })}
                    </span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400">
                      {t('analysis.exposureAnalysis.belowWHO')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
