import { Trophy, Thermometer, Droplets, Wind, CloudSun } from 'lucide-react';
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
  environmentalStats?: {
    avgTemperature: number | null;
    avgHumidity: number | null;
    avgPressure: number | null;
    avgTvoc: number | null;
    maxTvoc: number | null;
  };
}

export const DataSummary = ({ dataPoints, environmentalStats }: DataSummaryProps) => {
  const { t } = useTranslation();

  const hasEnvironmentalData = environmentalStats && (
    environmentalStats.avgTemperature !== null ||
    environmentalStats.avgHumidity !== null ||
    environmentalStats.avgPressure !== null ||
    environmentalStats.avgTvoc !== null
  );

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          {t('analysis.dataSummary')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* PM Statistics Grid */}
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

        {/* Environmental Statistics Section */}
        {hasEnvironmentalData && (
          <>
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <CloudSun className="h-4 w-4" />
                {t('analysis.environmental.title')}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {environmentalStats.avgTemperature !== null && (
                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                    <Thermometer className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                    <div className="text-sm font-semibold">
                      {environmentalStats.avgTemperature.toFixed(1)}°C
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('analysis.environmental.temperature')}
                    </div>
                  </div>
                )}
                {environmentalStats.avgHumidity !== null && (
                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                    <Droplets className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                    <div className="text-sm font-semibold">
                      {environmentalStats.avgHumidity.toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('analysis.environmental.humidity')}
                    </div>
                  </div>
                )}
                {environmentalStats.avgPressure !== null && (
                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                    <Wind className="h-4 w-4 mx-auto mb-1 text-gray-500" />
                    <div className="text-sm font-semibold">
                      {environmentalStats.avgPressure.toFixed(0)} hPa
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('analysis.environmental.pressure')}
                    </div>
                  </div>
                )}
                {environmentalStats.avgTvoc !== null && (
                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                    <CloudSun className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                    <div className="text-sm font-semibold">
                      {environmentalStats.avgTvoc.toFixed(0)} ppb
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('analysis.environmental.tvoc')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
