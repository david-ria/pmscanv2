import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { formatDurationHHMM } from '@/utils/timeFormat';

interface DataSummaryHeaderProps {
  dataPoints: {
    totalMissions: number;
    totalExposureMinutes: number;
    averagePM25: number;
    timeAboveWHO: number;
  } | null;
}

export const DataSummaryHeader = ({ dataPoints }: DataSummaryHeaderProps) => {
  const { t } = useTranslation();

  if (!dataPoints) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="text-sm">📊 {t('analysis.dataSummary')}</span>
            <span>{t('analysis.noDataAvailable')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }


  const getPM25BackgroundColor = (pm25: number) => {
    if (pm25 <= 12) return 'bg-green-50 dark:bg-green-900/20';
    if (pm25 <= 15) return 'bg-yellow-50 dark:bg-yellow-900/20';
    if (pm25 <= 35) return 'bg-orange-50 dark:bg-orange-900/20';
    return 'bg-red-50 dark:bg-red-900/20';
  };

  const getPM25TextColor = (pm25: number) => {
    if (pm25 <= 12) return 'text-green-700 dark:text-green-300';
    if (pm25 <= 15) return 'text-yellow-700 dark:text-yellow-300';
    if (pm25 <= 35) return 'text-orange-700 dark:text-orange-300';
    return 'text-red-700 dark:text-red-300';
  };

  const getPM25SubtextColor = (pm25: number) => {
    if (pm25 <= 12) return 'text-green-600 dark:text-green-400';
    if (pm25 <= 15) return 'text-yellow-600 dark:text-yellow-400';
    if (pm25 <= 35) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-primary font-medium">
              📊 {t('analysis.dataSummary')}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-muted/50 px-3 py-1 rounded-lg">
            <span className="font-bold text-foreground text-lg">
              {dataPoints.totalMissions}
            </span>
            <span className="text-muted-foreground text-xs">{t('analysis.missions')}</span>
          </div>

          <div className="flex items-center gap-1 bg-muted/50 px-3 py-1 rounded-lg">
            <span className="font-bold text-foreground text-lg">
              {formatDurationHHMM(dataPoints.totalExposureMinutes)}
            </span>
            <span className="text-muted-foreground text-xs">
              {t('analysis.exposureTime')}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-muted/50 px-3 py-1 rounded-lg">
            <span className="font-bold text-foreground text-lg">
              {formatDurationHHMM(dataPoints.timeAboveWHO)}
            </span>
            <span className="text-muted-foreground text-xs">
              {t('analysis.minutesAboveWHO')}
            </span>
          </div>

          <div
            className={`flex items-center gap-1 ${getPM25BackgroundColor(dataPoints.averagePM25)} px-3 py-1 rounded-lg`}
          >
            <span
              className={`font-bold ${getPM25TextColor(dataPoints.averagePM25)} text-lg`}
            >
              {Math.round(dataPoints.averagePM25)}
            </span>
            <span
              className={`${getPM25SubtextColor(dataPoints.averagePM25)} text-xs`}
            >
              {t('analysis.averagePM25')} ({t('analysis.units.ugm3')})
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
