import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapboxMap } from '@/components/MapboxMap';
import { PMLineGraph } from '@/components/PMLineGraph';
import { MissionData } from '@/lib/dataStorage';
import { WeatherInfo } from '@/components/WeatherInfo';
import { AirQualityInfo } from '@/components/AirQualityInfo';
import { useTranslation } from 'react-i18next';
import { useEvents } from '@/hooks/useEvents';
import { 
  Calendar, 
  MapPin, 
  Cigarette, 
  Truck, 
  Car, 
  Hammer, 
  Flame, 
  Wind, 
  Factory, 
  ChefHat,
  AlertCircle
} from 'lucide-react';

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

  // Load events for this mission
  useEffect(() => {
    if (mission && open) {
      console.log('Loading events for mission:', mission.id);
      getEventsByMission(mission.id).then((loadedEvents) => {
        console.log('Loaded events:', loadedEvents);
        setEvents(loadedEvents);
      });
    }
  }, [mission, open, getEventsByMission]);

  if (!mission) return null;

  // Convert mission measurements to the format expected by PMLineGraph
  const graphData = mission.measurements.map((measurement) => ({
    pmData: {
      pm1: measurement.pm1,
      pm25: measurement.pm25,
      pm10: measurement.pm10,
      temp: measurement.temperature || 0,
      humidity: measurement.humidity || 0,
      battery: 100, // Default values since these aren't stored in missions
      charging: false,
      timestamp: measurement.timestamp,
    },
    location:
      measurement.latitude && measurement.longitude
        ? {
            latitude: measurement.latitude,
            longitude: measurement.longitude,
            accuracy: measurement.accuracy || 0,
            timestamp: measurement.timestamp,
          }
        : undefined,
  }));

  // Get track points for the map (only measurements with location data)
  const trackPoints = mission.measurements
    .filter(
      (m) => m.latitude && m.longitude && m.latitude !== 0 && m.longitude !== 0
    )
    .map((m) => ({
      longitude: m.longitude!,
      latitude: m.latitude!,
      pm25: m.pm25,
      timestamp: m.timestamp,
    }));

  // Calculate statistics
  const pm1Values = mission.measurements.map((m) => m.pm1);
  const pm25Values = mission.measurements.map((m) => m.pm25);
  const pm10Values = mission.measurements.map((m) => m.pm10);

  const stats = {
    pm1: {
      avg: pm1Values.reduce((sum, val) => sum + val, 0) / pm1Values.length,
      min: Math.min(...pm1Values),
      max: Math.max(...pm1Values),
    },
    pm25: {
      avg: pm25Values.reduce((sum, val) => sum + val, 0) / pm25Values.length,
      min: Math.min(...pm25Values),
      max: Math.max(...pm25Values),
    },
    pm10: {
      avg: pm10Values.reduce((sum, val) => sum + val, 0) / pm10Values.length,
      min: Math.min(...pm10Values),
      max: Math.max(...pm10Values),
    },
  };

  const getQualityColor = (pm25: number) => {
    if (pm25 <= 12) return 'text-air-good';
    if (pm25 <= 35) return 'text-air-moderate';
    if (pm25 <= 55) return 'text-air-poor';
    return 'text-air-very-poor';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins} min`;
  };

  // Get the first location for map centering (if available)
  const firstLocation = mission.measurements.find(
    (m) => m.latitude && m.longitude && m.latitude !== 0 && m.longitude !== 0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{mission.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground">
                  {formatDate(mission.startTime)} •{' '}
                  {formatDuration(mission.durationMinutes)}
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
              {mission.weatherDataId && (
                <div className="mt-2">
                  <WeatherInfo weatherDataId={mission.weatherDataId} />
                </div>
              )}
              {mission.airQualityDataId && (
                <div className="mt-2">
                  <AirQualityInfo airQualityDataId={mission.airQualityDataId} />
                </div>
              )}
            </div>
            <div className="text-right pr-8">
              <div
                className={`text-2xl font-bold ${getQualityColor(mission.avgPm25)}`}
              >
                {Math.round(mission.avgPm25)}
              </div>
              <div className="text-xs text-muted-foreground">µg/m³ PM2.5</div>
              <div className="text-xs text-muted-foreground">
                {mission.measurementsCount} {t('history.measurements')}
              </div>
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
                            timestamp: firstLocation.timestamp,
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('realTime.graph')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-96">
                <PMLineGraph data={graphData} events={events} className="h-full" />
              </div>
            </CardContent>
          </Card>

          {/* Statistics Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t('history.statistics')}
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                        {stats.pm1.avg.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">
                        {t('history.minimum')}:
                      </span>
                      <span className="text-sm font-medium">
                        {stats.pm1.min.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">
                        {t('history.maximum')}:
                      </span>
                      <span className="text-sm font-medium">
                        {stats.pm1.max.toFixed(1)}
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
                        className={`text-sm font-medium ${getQualityColor(stats.pm25.avg)}`}
                      >
                        {stats.pm25.avg.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">
                        {t('history.minimum')}:
                      </span>
                      <span
                        className={`text-sm font-medium ${getQualityColor(stats.pm25.min)}`}
                      >
                        {stats.pm25.min.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">
                        {t('history.maximum')}:
                      </span>
                      <span
                        className={`text-sm font-medium ${getQualityColor(stats.pm25.max)}`}
                      >
                        {stats.pm25.max.toFixed(1)}
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
                        {stats.pm10.avg.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">
                        {t('history.minimum')}:
                      </span>
                      <span className="text-sm font-medium">
                        {stats.pm10.min.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">
                        {t('history.maximum')}:
                      </span>
                      <span className="text-sm font-medium">
                        {stats.pm10.max.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events Section */}
          {events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recorded Events ({events.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {events.map((event, index) => {
                    const getEventIcon = (type: string) => {
                      switch (type) {
                        case 'smoker': return <Cigarette className="h-4 w-4 text-red-500" />;
                        case 'truck': return <Truck className="h-4 w-4 text-blue-500" />;
                        case 'traffic': return <Car className="h-4 w-4 text-yellow-500" />;
                        case 'construction': return <Hammer className="h-4 w-4 text-orange-500" />;
                        case 'fire': return <Flame className="h-4 w-4 text-red-500" />;
                        case 'dust': return <Wind className="h-4 w-4 text-gray-500" />;
                        case 'industrial': return <Factory className="h-4 w-4 text-purple-500" />;
                        case 'cooking': return <ChefHat className="h-4 w-4 text-green-500" />;
                        default: return <AlertCircle className="h-4 w-4 text-blue-500" />;
                      }
                    };

                    const getEventLabel = (type: string) => {
                      switch (type) {
                        case 'smoker': return 'Smoker';
                        case 'truck': return 'Truck';
                        case 'traffic': return 'Heavy Traffic';
                        case 'construction': return 'Construction';
                        case 'fire': return 'Fire/Smoke';
                        case 'dust': return 'Dust';
                        case 'industrial': return 'Industrial Activity';
                        case 'cooking': return 'Cooking/BBQ';
                        default: return 'Other Event';
                      }
                    };

                    return (
                      <div key={event.id || index} className="border rounded-lg p-3 space-y-2 bg-card">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getEventIcon(event.event_type)}
                            <span className="font-medium">
                              {getEventLabel(event.event_type)}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </Badge>
                        </div>
                        {event.comment && (
                          <p className="text-sm text-muted-foreground pl-6">{event.comment}</p>
                        )}
                        {event.latitude && event.longitude && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground pl-6">
                            <MapPin className="h-3 w-3" />
                            <span>{event.latitude.toFixed(6)}, {event.longitude.toFixed(6)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Debug info for events (temporary) */}
          {events.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No events recorded for this mission. Debug info: Mission ID = {mission.id}
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  <p>Check console for event loading details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
