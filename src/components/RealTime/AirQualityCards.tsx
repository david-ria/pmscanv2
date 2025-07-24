import React, { memo, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PMScanData } from '@/lib/pmscan/types';
import { useTranslation } from 'react-i18next';
import { useThresholds } from '@/contexts/ThresholdContext';

interface AirQualityCardsProps {
  currentData: PMScanData | null;
  isConnected: boolean;
}

const AirQualityCards = memo(function AirQualityCards({
  currentData,
  isConnected,
}: AirQualityCardsProps) {
  const { t } = useTranslation();
  const { getAirQualityLevel } = useThresholds();

  // Memoize quality calculations to prevent unnecessary recalculations
  const qualityData = useMemo(() => {
    if (!currentData) return null;
    
    return {
      pm1: {
        value: Math.round(currentData.pm1),
        quality: getAirQualityLevel(currentData.pm1, 'pm1')
      },
      pm25: {
        value: Math.round(currentData.pm25),
        quality: getAirQualityLevel(currentData.pm25, 'pm25')
      },
      pm10: {
        value: Math.round(currentData.pm10),
        quality: getAirQualityLevel(currentData.pm10, 'pm10')
      },
      timestamp: currentData.timestamp.toLocaleTimeString()
    };
  }, [currentData, getAirQualityLevel]);

  if (!isConnected || !currentData) {
    return (
      <>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* No Data Cards */}
          <Card className="text-center bg-muted/30">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-muted-foreground mb-1">
                --
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                PM1
              </div>
              <div className="text-xs text-muted-foreground">μg/m³</div>
            </CardContent>
          </Card>
          <Card className="text-center bg-muted/30">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-muted-foreground mb-1">
                --
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                PM2.5
              </div>
              <div className="text-xs text-muted-foreground">μg/m³</div>
            </CardContent>
          </Card>
          <Card className="text-center bg-muted/30">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-muted-foreground mb-1">
                --
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                PM10
              </div>
              <div className="text-xs text-muted-foreground">μg/m³</div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground mb-4 p-4 bg-muted/20 rounded-lg">
          {t('realTime.connectSensor')}
        </div>
      </>
    );
  }

  if (!qualityData) return null;

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* PM1 */}
        <Card className={`text-center relative overflow-hidden`}>
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundColor: `hsl(var(--${qualityData.pm1.quality.color}))` }}
          />
          <CardContent className="p-4 relative">
            <div
              className="text-3xl font-bold mb-1"
              style={{ color: `hsl(var(--${qualityData.pm1.quality.color}))` }}
            >
              {qualityData.pm1.value}
            </div>
            <div className="text-sm font-medium text-muted-foreground">PM1</div>
            <div className="text-xs text-muted-foreground">μg/m³</div>
          </CardContent>
        </Card>

        {/* PM2.5 - Main indicator with quality status */}
        <Card className="text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundColor: `hsl(var(--${qualityData.pm25.quality.color}))` }}
          />
          <CardContent className="p-4 relative">
            <div
              className="text-3xl font-bold mb-1"
              style={{ color: `hsl(var(--${qualityData.pm25.quality.color}))` }}
            >
              {qualityData.pm25.value}
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              PM2.5
            </div>
            <div className="text-xs text-muted-foreground mb-2">μg/m³</div>
            <div
              className="text-xs font-medium px-2 py-1 rounded-full"
              style={{
                backgroundColor: `hsl(var(--${qualityData.pm25.quality.color}) / 0.2)`,
                color: `hsl(var(--${qualityData.pm25.quality.color}))`,
              }}
            >
              {t(`realTime.airQuality.${qualityData.pm25.quality.level}`)}
            </div>
          </CardContent>
        </Card>

        {/* PM10 */}
        <Card className={`text-center relative overflow-hidden`}>
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundColor: `hsl(var(--${qualityData.pm10.quality.color}))` }}
          />
          <CardContent className="p-4 relative">
            <div
              className="text-3xl font-bold mb-1"
              style={{ color: `hsl(var(--${qualityData.pm10.quality.color}))` }}
            >
              {qualityData.pm10.value}
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              PM10
            </div>
            <div className="text-xs text-muted-foreground">μg/m³</div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Status */}
      <div className="text-center text-xs text-muted-foreground mb-4">
        {t('realTime.lastMeasurement')} :{' '}
        {qualityData.timestamp}
      </div>
    </>
  );
});

export { AirQualityCards };
