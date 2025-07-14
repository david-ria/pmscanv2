import { Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

interface DataSummaryProps {
  dataPoints: {
    totalMissions: number;
    totalExposureMinutes: number;
    averagePM25: number;
    maxPM25: number;
    timeAboveWHO: number;
  };
}

export const DataSummary = ({ dataPoints }: DataSummaryProps) => {
  const { t } = useTranslation();

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          {t('analysis.dataSummary')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="text-center p-2 sm:p-3 bg-primary/10 rounded-lg">
            <div className="text-lg sm:text-2xl font-bold text-primary">
              {dataPoints.totalMissions}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('analysis.missions')}
            </div>
          </div>
          <div className="text-center p-2 sm:p-3 bg-accent rounded-lg">
            <div className="text-lg sm:text-2xl font-bold text-foreground">
              {Math.round(dataPoints.totalExposureMinutes / 60)}h
            </div>
            <div className="text-xs text-muted-foreground">
              {t('analysis.exposureTime')}
            </div>
          </div>
          <div className="text-center p-2 sm:p-3 bg-air-moderate/10 rounded-lg">
            <div className="text-lg sm:text-2xl font-bold text-air-moderate">
              {Math.round(dataPoints.averagePM25)}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('analysis.averagePM25')}
            </div>
          </div>
          <div className="text-center p-2 sm:p-3 bg-air-poor/10 rounded-lg">
            <div className="text-lg sm:text-2xl font-bold text-air-poor">
              {Math.round(dataPoints.timeAboveWHO)}
            </div>
            <div className="text-xs text-muted-foreground leading-tight">
              {t('analysis.minutesAboveWHO')}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
