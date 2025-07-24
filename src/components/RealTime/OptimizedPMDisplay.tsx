import React, { memo, useMemo, useRef, useEffect } from 'react';
import { PMScanData } from '@/lib/pmscan/types';
import { throttle } from '@/utils/performance';
import { Card, CardContent } from '@/components/ui/card';
import { useThresholds } from '@/contexts/ThresholdContext';
import { useTranslation } from 'react-i18next';

interface OptimizedPMDisplayProps {
  currentData: PMScanData | null;
  isConnected: boolean;
}

// Throttled component to reduce rendering frequency
const OptimizedPMDisplay = memo(function OptimizedPMDisplay({
  currentData,
  isConnected,
}: OptimizedPMDisplayProps) {
  const { t } = useTranslation();
  const { getAirQualityLevel } = useThresholds();
  const lastUpdateRef = useRef<number>(0);

  // Throttle data updates to max 2 per second to reduce CPU usage
  const throttledData = useMemo(() => {
    if (!currentData) return null;
    
    const now = Date.now();
    if (now - lastUpdateRef.current < 500) { // Max 2 updates per second
      return null; // Skip this update
    }
    
    lastUpdateRef.current = now;
    
    return {
      pm1: Math.round(currentData.pm1),
      pm25: Math.round(currentData.pm25),
      pm10: Math.round(currentData.pm10),
      timestamp: currentData.timestamp.toLocaleTimeString(),
      qualities: {
        pm1: getAirQualityLevel(currentData.pm1, 'pm1'),
        pm25: getAirQualityLevel(currentData.pm25, 'pm25'),
        pm10: getAirQualityLevel(currentData.pm10, 'pm10'),
      }
    };
  }, [currentData, getAirQualityLevel]);

  // Use previous data if throttled data is null
  const displayDataRef = useRef(throttledData);
  const displayData = throttledData || displayDataRef.current;
  
  useEffect(() => {
    if (throttledData) {
      displayDataRef.current = throttledData;
    }
  }, [throttledData]);

  if (!isConnected || !displayData) {
    return (
      <div className="grid grid-cols-3 gap-3 mb-4">
        {['PM1', 'PM2.5', 'PM10'].map((label) => (
          <Card key={label} className="text-center bg-muted/30">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-muted-foreground mb-1">--</div>
              <div className="text-sm font-medium text-muted-foreground">{label}</div>
              <div className="text-xs text-muted-foreground">μg/m³</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* PM1 */}
        <Card className="text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundColor: `hsl(var(--${displayData.qualities.pm1.color}))` }}
          />
          <CardContent className="p-4 relative">
            <div
              className="text-3xl font-bold mb-1"
              style={{ color: `hsl(var(--${displayData.qualities.pm1.color}))` }}
            >
              {displayData.pm1}
            </div>
            <div className="text-sm font-medium text-muted-foreground">PM1</div>
            <div className="text-xs text-muted-foreground">μg/m³</div>
          </CardContent>
        </Card>

        {/* PM2.5 - Main indicator */}
        <Card className="text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundColor: `hsl(var(--${displayData.qualities.pm25.color}))` }}
          />
          <CardContent className="p-4 relative">
            <div
              className="text-3xl font-bold mb-1"
              style={{ color: `hsl(var(--${displayData.qualities.pm25.color}))` }}
            >
              {displayData.pm25}
            </div>
            <div className="text-sm font-medium text-muted-foreground">PM2.5</div>
            <div className="text-xs text-muted-foreground mb-2">μg/m³</div>
            <div
              className="text-xs font-medium px-2 py-1 rounded-full"
              style={{
                backgroundColor: `hsl(var(--${displayData.qualities.pm25.color}) / 0.2)`,
                color: `hsl(var(--${displayData.qualities.pm25.color}))`,
              }}
            >
              {t(`realTime.airQuality.${displayData.qualities.pm25.level}`)}
            </div>
          </CardContent>
        </Card>

        {/* PM10 */}
        <Card className="text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundColor: `hsl(var(--${displayData.qualities.pm10.color}))` }}
          />
          <CardContent className="p-4 relative">
            <div
              className="text-3xl font-bold mb-1"
              style={{ color: `hsl(var(--${displayData.qualities.pm10.color}))` }}
            >
              {displayData.pm10}
            </div>
            <div className="text-sm font-medium text-muted-foreground">PM10</div>
            <div className="text-xs text-muted-foreground">μg/m³</div>
          </CardContent>
        </Card>
      </div>

      {/* Timestamp with reduced update frequency */}
      <div className="text-center text-xs text-muted-foreground mb-4">
        {t('realTime.lastMeasurement')}: {displayData.timestamp}
      </div>
    </>
  );
});

export { OptimizedPMDisplay };