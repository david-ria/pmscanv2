import { useState, useEffect } from 'react';
import * as logger from '@/utils/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Database,
  Clock,
  MapPin,
  Thermometer,
  Droplet,
  ChevronDown,
  ChevronUp,
  Download,
  Brain,
} from 'lucide-react';
import { PMScanData } from '@/lib/pmscan/types';
import { LocationData } from '@/types/PMScan';
import { useTranslation } from 'react-i18next';
import { useAutoContext } from '@/hooks/useAutoContext';
import { WeatherInfo } from '@/components/WeatherInfo';
import { useRecordingContext } from '@/contexts/RecordingContext';

// Data logger component for real-time PM measurement tracking
interface DataLogEntry {
  id: string;
  timestamp: Date;
  pmData: PMScanData;
  location?: LocationData;
  missionContext?: {
    location: string;
    activity: string;
  };
  automaticContext?: string;
  // weatherDataId removed - now at mission level
}

interface DataLoggerProps {
  isRecording: boolean;
  currentData?: PMScanData;
  currentLocation?: LocationData;
  missionContext?: {
    location: string;
    activity: string;
  };
  className?: string;
}

export function DataLogger({
  isRecording,
  currentData,
  currentLocation,
  missionContext,
  className,
}: DataLoggerProps) {
  const { t } = useTranslation();
  const { recordingData } = useRecordingContext();
  const { latestContext, isEnabled: autoContextEnabled } = useAutoContext();
  const [isMinimized, setIsMinimized] = useState(false);
  

  // Use actual recording data instead of managing separate log
  const displayData = recordingData.slice(0, 100).map((entry, index) => ({
    id: index.toString(),
    timestamp: entry.pmData.timestamp,
    pmData: entry.pmData,
    location: entry.location,
    missionContext: entry.context,
    automaticContext: entry.automaticContext,
  }));

  // Get the most recent autocontext from recording data if available
  const currentAutoContext = displayData.length > 0 && displayData[0].automaticContext 
    ? displayData[0].automaticContext 
    : latestContext;

  const clearLog = () => {
    // This would need to be implemented in the context if needed
    logger.debug('Clear log requested - this would clear actual recording data');
  };


  const exportRawData = async () => {
    if (displayData.length === 0) return;

    const headers = [
      'Timestamp',
      'PM1 (μg/m³)',
      'PM2.5 (μg/m³)',
      'PM10 (μg/m³)',
      'Temperature (°C)',
      'Humidity (%)',
      'Latitude',
      'Longitude',
      'GPS Accuracy (m)',
      'Location Context',
      'Activity Context',
      'Auto Context',
    ];

    const csvContent = [
      headers.join(','),
      ...displayData.map((entry) =>
        [
          entry.timestamp.toISOString(),
          entry.pmData.pm1.toFixed(2),
          entry.pmData.pm25.toFixed(2),
          entry.pmData.pm10.toFixed(2),
          entry.pmData.temp.toFixed(2),
          entry.pmData.humidity.toFixed(1),
          entry.location?.latitude?.toFixed(6) || '',
          entry.location?.longitude?.toFixed(6) || '',
          entry.location?.accuracy?.toFixed(0) || '',
          entry.missionContext?.location || '',
          entry.missionContext?.activity || '',
          entry.automaticContext || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `journal-donnees-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getAirQualityColor = (pm25: number) => {
    if (pm25 <= 12) return 'text-air-good';
    if (pm25 <= 35) return 'text-air-moderate';
    if (pm25 <= 55) return 'text-air-poor';
    return 'text-air-very-poor';
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between p-2 sm:p-3 bg-card/50 border rounded-t-lg text-sm">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          <span className="font-medium text-sm">
            {t('realTime.dataLogger')}
          </span>
          {autoContextEnabled && (
            <>
              <Brain className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="text-xs bg-muted">
                {currentAutoContext || 'Detecting...'}
              </Badge>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {displayData.length > 0 && (
            <span className="text-muted-foreground text-xs hidden sm:inline">
              {t('realTime.last')}: {displayData[0]?.timestamp.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={exportRawData}
            disabled={displayData.length === 0}
            className="h-8 w-8 p-0"
            title={t('realTime.export')}
          >
            <Download className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearLog}
            disabled={displayData.length === 0}
            className="h-8 px-2 text-xs"
          >
            {t('realTime.clear')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8 p-0"
            title={isMinimized ? t('realTime.expand') : t('realTime.minimize')}
          >
            {isMinimized ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Console Log Display */}
      {!isMinimized && (
        <div className="bg-background border-x border-b rounded-b-lg p-2 sm:p-3 h-32 sm:h-40 overflow-auto animate-accordion-down">
          {displayData.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Database className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('realTime.noData')}</p>
              <p className="text-xs mt-1">
                {isRecording
                  ? t('realTime.waitingData')
                  : t('realTime.startRecording')}
              </p>
            </div>
          ) : (
            <div className="space-y-1 font-mono text-xs">
              {displayData.map((entry) => (
                <div key={entry.id} className="text-muted-foreground break-all">
                  <div className="text-xs">
                    [{entry.timestamp.toLocaleTimeString()}] New reading: PM1=
                    {entry.pmData.pm1.toFixed(1)}ug/m³,
                  </div>
                  <div className="text-xs pl-2">
                    PM2.5={entry.pmData.pm25.toFixed(1)}ug/m³, PM10=
                    {entry.pmData.pm10.toFixed(1)}ug/m³, Temp=
                    {entry.pmData.temp.toFixed(1)}°C
                  </div>
                  {entry.location && (
                    <div className="text-xs pl-2">
                      GPS: {entry.location.latitude.toFixed(6)},{' '}
                      {entry.location.longitude.toFixed(6)} (+
                      {Math.round(entry.location.accuracy || 0)}m)
                    </div>
                  )}
                  {entry.missionContext &&
                    (entry.missionContext.location ||
                      entry.missionContext.activity) && (
                      <div className="text-xs pl-2">
                        Tags:{' '}
                        {[
                          entry.missionContext.location,
                          entry.missionContext.activity,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    )}
                   {entry.automaticContext && (
                    <div className="text-xs pl-2 text-blue-400">
                      Auto: {entry.automaticContext}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Minimized state - show border bottom when minimized */}
      {isMinimized && (
        <div className="border-x border-b rounded-b-lg h-1"></div>
      )}
    </div>
  );
}
