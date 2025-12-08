import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SensorReadingData as PMScanData } from '@/types/sensor';
import { useTranslation } from 'react-i18next';
import { useThresholds } from '@/contexts/ThresholdContext';
import { memo, useMemo } from 'react';
import { formatTime, createTimestamp } from '@/utils/timeFormat';

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

  // Memoize quality calculations to avoid recalculation on every render
  const qualityData = useMemo(() => {
    // Add defensive checks for currentData
    if (!currentData || typeof currentData !== 'object') return null;
    
    // Ensure all required properties exist and are numbers
    const pm25 = typeof currentData.pm25 === 'number' ? currentData.pm25 : 0;
    const pm1 = typeof currentData.pm1 === 'number' ? currentData.pm1 : 0;
    const pm10 = typeof currentData.pm10 === 'number' ? currentData.pm10 : 0;
    
    // Environmental data (optional - may not be available on all sensors)
    const temp = typeof currentData.temp === 'number' ? currentData.temp : undefined;
    const humidity = typeof currentData.humidity === 'number' ? currentData.humidity : undefined;
    const tvoc = typeof currentData.tvoc === 'number' ? currentData.tvoc : undefined;
    
    return {
      pm25: getAirQualityLevel(pm25, 'pm25'),
      pm1: getAirQualityLevel(pm1, 'pm1'),
      pm10: getAirQualityLevel(pm10, 'pm10'),
      roundedValues: {
        pm1: pm1.toFixed(1),
        pm25: pm25.toFixed(1),
        pm10: pm10.toFixed(1),
      },
      environmental: {
        temp: temp !== undefined ? temp.toFixed(1) : undefined,
        humidity: humidity !== undefined ? humidity.toFixed(0) : undefined,
        tvoc: tvoc !== undefined ? tvoc.toFixed(0) : undefined,
      },
      timestamp: currentData.timestamp instanceof Date 
        ? formatTime(currentData.timestamp)
        : formatTime(createTimestamp()),
    };
  }, [currentData, getAirQualityLevel]);

  // Show skeleton while loading/connecting
  if (!isConnected && !currentData) {
    return (
      <>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="text-center">
              <CardContent className="p-4">
                <Skeleton className="h-9 w-12 mx-auto mb-2" />
                <Skeleton className="h-4 w-8 mx-auto mb-1" />
                <Skeleton className="h-3 w-10 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center mb-4">
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </>
    );
  }

  // Show "no data" state when connected but no data
  if (!currentData || !qualityData) {
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

        <div className="text-center text-sm text-muted-foreground mb-4 p-4 bg-muted/20 rounded-lg air-quality-status">
          {t('realTime.connectSensor')}
        </div>
      </>
    );
  }

  const { pm25: pm25Quality, pm1: pm1Quality, pm10: pm10Quality, roundedValues, environmental, timestamp } = qualityData;

  const hasEnvironmentalData = environmental.temp !== undefined || 
    environmental.humidity !== undefined || 
    environmental.tvoc !== undefined;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
        {/* PM1 */}
        <Card className={`text-center relative overflow-hidden`}>
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundColor: `hsl(var(--${pm1Quality.color}))` }}
          />
          <CardContent className="p-2 sm:p-4 relative">
            <div
              className="text-xl sm:text-3xl font-bold mb-1"
              style={{ color: `hsl(var(--${pm1Quality.color}))` }}
            >
              {roundedValues.pm1}
            </div>
            <div className="text-xs sm:text-sm font-medium text-muted-foreground">PM1</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">μg/m³</div>
          </CardContent>
        </Card>

        {/* PM2.5 - Main indicator with quality status */}
        <Card className="text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundColor: `hsl(var(--${pm25Quality.color}))` }}
          />
          <CardContent className="p-2 sm:p-4 relative">
            <div
              className="text-xl sm:text-3xl font-bold mb-1"
              style={{ color: `hsl(var(--${pm25Quality.color}))` }}
            >
              {roundedValues.pm25}
            </div>
            <div className="text-xs sm:text-sm font-medium text-muted-foreground">
              PM2.5
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-2">μg/m³</div>
            <div
              className="text-[10px] sm:text-xs font-medium px-1 sm:px-2 py-0.5 sm:py-1 rounded-full"
              style={{
                backgroundColor: `hsl(var(--${pm25Quality.color}) / 0.2)`,
                color: `hsl(var(--${pm25Quality.color}))`,
              }}
            >
              {t(`realTime.airQuality.${pm25Quality.level}`)}
            </div>
          </CardContent>
        </Card>

        {/* PM10 */}
        <Card className={`text-center relative overflow-hidden`}>
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundColor: `hsl(var(--${pm10Quality.color}))` }}
          />
          <CardContent className="p-2 sm:p-4 relative">
            <div
              className="text-xl sm:text-3xl font-bold mb-1"
              style={{ color: `hsl(var(--${pm10Quality.color}))` }}
            >
              {roundedValues.pm10}
            </div>
            <div className="text-xs sm:text-sm font-medium text-muted-foreground">
              PM10
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">μg/m³</div>
          </CardContent>
        </Card>
      </div>

      {/* Environmental Data Cards */}
      {hasEnvironmentalData && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          {/* Temperature */}
          <Card className="text-center bg-sky-500/5 border-sky-500/20">
            <CardContent className="p-2 sm:p-4">
              <div className="text-xl sm:text-3xl font-bold mb-1 text-sky-600 dark:text-sky-400">
                {environmental.temp ?? '--'}
              </div>
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                {t('realTime.environmental.temperature')}
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">°C</div>
            </CardContent>
          </Card>

          {/* Humidity */}
          <Card className="text-center bg-cyan-500/5 border-cyan-500/20">
            <CardContent className="p-2 sm:p-4">
              <div className="text-xl sm:text-3xl font-bold mb-1 text-cyan-600 dark:text-cyan-400">
                {environmental.humidity ?? '--'}
              </div>
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                {t('realTime.environmental.humidity')}
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">%</div>
            </CardContent>
          </Card>

          {/* TVOC */}
          <Card className="text-center bg-amber-500/5 border-amber-500/20">
            <CardContent className="p-2 sm:p-4">
              <div className="text-xl sm:text-3xl font-bold mb-1 text-amber-600 dark:text-amber-400">
                {environmental.tvoc ?? '--'}
              </div>
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                {t('realTime.environmental.tvoc')}
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">ppb</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Real-time Status */}
      <div className="text-center text-xs text-muted-foreground mb-4">
        {t('realTime.lastMeasurement')} : {timestamp}
      </div>
    </>
  );
});

export { AirQualityCards };
