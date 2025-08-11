import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { formatDurationHHMM } from '@/utils/timeFormat';
import { OverallStats, ContextStats, getQualityColor } from '@/lib/analysis/mission';

interface MetricsPanelProps {
  overallStats: OverallStats;
  contextStats: {
    location: Record<string, ContextStats>;
    activity: Record<string, ContextStats>;
    autocontext: Record<string, ContextStats>;
  };
}

export const MetricsPanel = memo<MetricsPanelProps>(({ overallStats, contextStats }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {t('history.statistics')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall Statistics */}
        <div className="mb-6">
          <h4 className="font-medium text-sm text-muted-foreground mb-3">
            Overall Averages
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* PM1 Stats */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">
                PM1.0 (µg/m³)
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">
                    {t('history.average')}:
                  </span>
                  <span className="text-sm font-medium">
                    {overallStats.pm1.avg.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">
                    {t('history.minimum')}:
                  </span>
                  <span className="text-sm font-medium">
                    {overallStats.pm1.min.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">
                    {t('history.maximum')}:
                  </span>
                  <span className="text-sm font-medium">
                    {overallStats.pm1.max.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* PM2.5 Stats */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">
                PM2.5 (µg/m³)
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">
                    {t('history.average')}:
                  </span>
                  <span
                    className={`text-sm font-medium ${getQualityColor(overallStats.pm25.avg)}`}
                  >
                    {overallStats.pm25.avg.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">
                    {t('history.minimum')}:
                  </span>
                  <span
                    className={`text-sm font-medium ${getQualityColor(overallStats.pm25.min)}`}
                  >
                    {overallStats.pm25.min.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">
                    {t('history.maximum')}:
                  </span>
                  <span
                    className={`text-sm font-medium ${getQualityColor(overallStats.pm25.max)}`}
                  >
                    {overallStats.pm25.max.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* PM10 Stats */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">
                PM10 (µg/m³)
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">
                    {t('history.average')}:
                  </span>
                  <span className="text-sm font-medium">
                    {overallStats.pm10.avg.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">
                    {t('history.minimum')}:
                  </span>
                  <span className="text-sm font-medium">
                    {overallStats.pm10.min.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">
                    {t('history.maximum')}:
                  </span>
                  <span className="text-sm font-medium">
                    {overallStats.pm10.max.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Context-based Statistics */}
        {Object.entries(contextStats).map(([contextType, stats]) => {
          if (Object.keys(stats).length === 0) return null;
          
          return (
            <div key={contextType} className="mb-6">
              <h4 className="font-medium text-sm text-muted-foreground mb-3 capitalize">
                Averages by {contextType}
              </h4>
               <div className="grid grid-cols-1 gap-4">
                 {Object.entries(stats).map(([context, values]) => (
                   <div key={context} className="border rounded-lg p-3 bg-card">
                     <div className="flex items-center justify-between mb-2">
                       <h5 className="font-medium text-sm capitalize">{context}</h5>
                       <div className="text-xs text-muted-foreground">
                          {formatDurationHHMM(values.timeSpent)}
                       </div>
                     </div>
                     <div className="grid grid-cols-3 gap-4 text-xs">
                       <div className="text-center">
                         <div className="text-muted-foreground">PM1.0</div>
                         <div className="font-medium">{values.pm1.toFixed(1)} µg/m³</div>
                       </div>
                       <div className="text-center">
                         <div className="text-muted-foreground">PM2.5</div>
                         <div className={`font-medium ${getQualityColor(values.pm25)}`}>
                           {values.pm25.toFixed(1)} µg/m³
                         </div>
                       </div>
                       <div className="text-center">
                         <div className="text-muted-foreground">PM10</div>
                         <div className="font-medium">{values.pm10.toFixed(1)} µg/m³</div>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});

MetricsPanel.displayName = 'MetricsPanel';