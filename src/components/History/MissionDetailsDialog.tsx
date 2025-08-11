import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapboxMap } from '@/components/MapboxMap';
import { MissionData } from '@/lib/dataStorage';
import { WeatherInfo } from '@/components/WeatherInfo';
import { AirQualityInfo } from '@/components/AirQualityInfo';
import { useTranslation } from 'react-i18next';
import { useEvents } from '@/hooks/useEvents';
import { formatDateTime, formatDurationHHMM } from '@/utils/timeFormat';
import { 
  computeOverallStats,
  computeContextPeriods,
  transformToGraphData,
  extractTrackPoints,
  findFirstLocation,
  getQualityColor,
  selectContextType
} from '@/lib/analysis/mission';
import { 
  MetricsPanel, 
  GraphPanel, 
  EventsPanel, 
  ExportActions 
} from './MissionDetails';

interface MissionDetailsDialogProps {
  mission: MissionData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MissionDetailsDialog({
  mission,
  open,
  onOpenChange,
}: MissionDetailsDialogProps) {
  const { t } = useTranslation();
  const { getEventsByMission } = useEvents();
  const [events, setEvents] = useState<any[]>([]);
  
  // Refs for capturing content
  const graphRef = useRef<HTMLDivElement>(null);
  
  // Context highlighting state - memoized to prevent recalculation
  const initialContextType = useMemo(() => {
    if (!mission) return 'location';
    return selectContextType(mission.measurements, mission.locationContext, mission.activityContext);
  }, [mission]);

  const [selectedContextType, setSelectedContextType] = useState<'location' | 'activity' | 'autocontext'>(initialContextType);

  // Auto-select context type when mission changes - memoized callback
  const updateContextType = useCallback(() => {
    if (mission) {
      const contextType = selectContextType(mission.measurements, mission.locationContext, mission.activityContext);
      setSelectedContextType(contextType);
    }
  }, [mission]);

  useEffect(() => {
    updateContextType();
  }, [updateContextType]);

  // Load events for this mission - memoized callback
  const loadEvents = useCallback(async () => {
    if (mission && open) {
      console.log('Loading events for mission:', mission.id);
      const loadedEvents = await getEventsByMission(mission.id);
      console.log('Loaded events:', loadedEvents);
      setEvents(loadedEvents);
    }
  }, [mission, open, getEventsByMission]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Memoized calculations using pure functions
  const overallStats = useMemo(() => {
    if (!mission) return { pm1: { avg: 0, min: 0, max: 0 }, pm25: { avg: 0, min: 0, max: 0 }, pm10: { avg: 0, min: 0, max: 0 } };
    return computeOverallStats(mission.measurements);
  }, [mission]);

  const contextStats = useMemo(() => {
    if (!mission) return { location: {}, activity: {}, autocontext: {} };
    return computeContextPeriods(
      mission.measurements, 
      mission.durationMinutes, 
      mission.locationContext, 
      mission.activityContext
    );
  }, [mission]);

  const graphData = useMemo(() => {
    if (!mission) return [];
    return transformToGraphData(mission.measurements, mission.locationContext, mission.activityContext);
  }, [mission]);

  const trackPoints = useMemo(() => {
    if (!mission) return [];
    return extractTrackPoints(mission.measurements);
  }, [mission]);

  const firstLocation = useMemo(() => {
    if (!mission) return null;
    return findFirstLocation(mission.measurements);
  }, [mission]);

  // Memoized context type change handler
  const handleContextTypeChange = useCallback((contextType: 'location' | 'activity' | 'autocontext') => {
    setSelectedContextType(contextType);
  }, []);

  if (!mission) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="space-y-4">
            <div>
              <DialogTitle className="text-xl">{mission.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(mission.startTime)} •{' '}
                  {formatDurationHHMM(mission.durationMinutes)}
                </p>
                {!mission.synced && (
                  <Badge variant="outline" className="text-xs">
                    {t('history.local')}
                  </Badge>
                )}
              </div>
              {mission.locationContext && mission.activityContext && (
                <p className="text-xs text-muted-foreground mt-1">
                  {mission.locationContext} • {mission.activityContext}
                </p>
              )}
            </div>
            
            {/* Mission Stats - Mobile Friendly Layout */}
            <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${getQualityColor(mission.avgPm25)}`}
                  >
                    {Math.round(mission.avgPm25)}
                  </div>
                  <div className="text-xs text-muted-foreground">µg/m³ PM2.5</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {mission.measurementsCount}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('history.measurements')}
                  </div>
                </div>
              </div>
            </div>

            {/* Weather and Air Quality Info */}
            <div className="space-y-2">
              {mission.weatherDataId && (
                <WeatherInfo weatherDataId={mission.weatherDataId} />
              )}
              {mission.airQualityDataId && (
                <AirQualityInfo airQualityDataId={mission.airQualityDataId} />
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Map Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('realTime.map')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                {trackPoints.length > 0 ? (
                  <MapboxMap
                     currentLocation={
                       firstLocation
                         ? {
                             latitude: firstLocation.latitude!,
                             longitude: firstLocation.longitude!,
                             accuracy: firstLocation.accuracy || 0,
                             timestamp: typeof firstLocation.timestamp === 'number' 
                               ? firstLocation.timestamp 
                               : firstLocation.timestamp.getTime(),
                           }
                         : null
                     }
                    trackPoints={trackPoints}
                    isRecording={false}
                    className="h-full w-full"
                  />
                ) : (
                  <div className="h-full bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">
                      {t('history.noLocationData')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Graph Section */}
          <GraphPanel
            ref={graphRef}
            mission={mission}
            graphData={graphData}
            events={events}
            selectedContextType={selectedContextType}
            onContextTypeChange={handleContextTypeChange}
          />

          {/* Statistics Section */}
          <MetricsPanel 
            overallStats={overallStats}
            contextStats={contextStats}
          />

          {/* Events Section */}
          <EventsPanel events={events} />

          {/* Export Actions */}
          <ExportActions
            mission={mission}
            overallStats={overallStats}
            contextStats={contextStats}
            events={events}
            graphRef={graphRef}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}