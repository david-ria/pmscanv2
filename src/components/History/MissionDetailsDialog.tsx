import React, { useEffect, useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapboxMap } from '@/components/MapboxMap';
import { PMLineGraph } from '@/components/PMLineGraph';
import { GraphContextSelector } from './GraphContextSelector';
import { MissionData } from '@/lib/dataStorage';
import { WeatherInfo } from '@/components/WeatherInfo';
import { AirQualityInfo } from '@/components/AirQualityInfo';
import { useTranslation } from 'react-i18next';
import { useEvents } from '@/hooks/useEvents';
import { formatDateTime, formatDurationHHMM } from '@/utils/timeFormat';
import { getEventLabel } from '@/utils/eventTypes';
import { downloadPDF } from '@/lib/pdfExport';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';
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
  AlertCircle,
  Download,
  Image as ImageIcon,
  FileText
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
  const { toast } = useToast();
  const { getEventsByMission } = useEvents();
  const [events, setEvents] = useState<any[]>([]);
  
  // Refs for capturing content
  const graphRef = useRef<HTMLDivElement>(null);
  const missionContentRef = useRef<HTMLDivElement>(null);
  
  // Context highlighting state - automatically select first available context
  const [selectedContextType, setSelectedContextType] = useState<'location' | 'activity' | 'autocontext'>(() => {
    if (!mission) return 'location';
    
    // Check for available contexts and auto-select the first one
    const hasLocationContext = !!(mission.locationContext || 
      mission.measurements.some(m => m.locationContext));
    const hasActivityContext = !!(mission.activityContext || 
      mission.measurements.some(m => m.activityContext));
    const hasAutoContext = mission.measurements.some(m => 
      m.automaticContext && m.automaticContext !== 'unknown');
    
    // Auto-select first available context type
    if (hasLocationContext) return 'location';
    if (hasActivityContext) return 'activity'; 
    if (hasAutoContext) return 'autocontext';
    
    return 'location';
  });

  // Auto-select context type when mission changes
  useEffect(() => {
    if (mission) {
      const hasLocationContext = !!(mission.locationContext || 
        mission.measurements.some(m => m.locationContext));
      const hasActivityContext = !!(mission.activityContext || 
        mission.measurements.some(m => m.activityContext));
      const hasAutoContext = mission.measurements.some(m => 
        m.automaticContext && m.automaticContext !== 'unknown');
      
      // Auto-select first available context type
      if (hasLocationContext) {
        setSelectedContextType('location');
      } else if (hasActivityContext) {
        setSelectedContextType('activity');
      } else if (hasAutoContext) {
        setSelectedContextType('autocontext');
      } else {
        setSelectedContextType('location');
      }
    }
  }, [mission]);

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
  const graphData = mission.measurements.map((measurement, index) => {
    // Debug logging for the first few measurements
    if (index < 3) {
      console.log(`Measurement ${index} context data:`, {
        measurementLocationContext: measurement.locationContext,
        measurementActivityContext: measurement.activityContext,
        measurementAutomaticContext: measurement.automaticContext,
        missionLocationContext: mission.locationContext,
        missionActivityContext: mission.activityContext,
      });
    }
    
    return {
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
      context: {
        locationContext: measurement.locationContext || mission.locationContext,
        activityContext: measurement.activityContext || mission.activityContext,
        automaticContext: measurement.automaticContext,
      },
    };
  });

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

  // Calculate context-based averages and time spent
  const calculateContextAverages = (contextType: 'location' | 'activity' | 'autocontext') => {
    const contextMap = new Map<string, { 
      pm1: number[], 
      pm25: number[], 
      pm10: number[], 
      measurementCount: number 
    }>();
    
    mission.measurements.forEach((measurement) => {
      let contextValue: string | undefined;
      
      switch (contextType) {
        case 'location':
          contextValue = measurement.locationContext || mission.locationContext;
          break;
        case 'activity':
          contextValue = measurement.activityContext || mission.activityContext;
          break;
        case 'autocontext':
          contextValue = measurement.automaticContext;
          break;
      }
      
      if (contextValue && contextValue !== 'unknown') {
        if (!contextMap.has(contextValue)) {
          contextMap.set(contextValue, { pm1: [], pm25: [], pm10: [], measurementCount: 0 });
        }
        const context = contextMap.get(contextValue)!;
        context.pm1.push(measurement.pm1);
        context.pm25.push(measurement.pm25);
        context.pm10.push(measurement.pm10);
        context.measurementCount++;
      }
    });
    
    const averages: Record<string, { 
      pm1: number, 
      pm25: number, 
      pm10: number, 
      timeSpent: number 
    }> = {};
    
    // Calculate total measurements to determine time per measurement
    const totalMeasurements = mission.measurements.length;
    const timePerMeasurement = totalMeasurements > 0 ? mission.durationMinutes / totalMeasurements : 0;
    
    contextMap.forEach((values, context) => {
      const timeSpent = values.measurementCount * timePerMeasurement;
      averages[context] = {
        pm1: values.pm1.length > 0 ? values.pm1.reduce((sum, val) => sum + val, 0) / values.pm1.length : 0,
        pm25: values.pm25.length > 0 ? values.pm25.reduce((sum, val) => sum + val, 0) / values.pm25.length : 0,
        pm10: values.pm10.length > 0 ? values.pm10.reduce((sum, val) => sum + val, 0) / values.pm10.length : 0,
        timeSpent: timeSpent,
      };
    });
    
    return averages;
  };

  const contextStats = {
    location: calculateContextAverages('location'),
    activity: calculateContextAverages('activity'),
    autocontext: calculateContextAverages('autocontext'),
  };

  const getQualityColor = (pm25: number) => {
    if (pm25 <= 12) return 'text-air-good';
    if (pm25 <= 35) return 'text-air-moderate';
    if (pm25 <= 55) return 'text-air-poor';
    return 'text-air-very-poor';
  };

  // Export functions
  const saveGraphAsImage = async () => {
    if (!graphRef.current) return;
    
    try {
      const canvas = await html2canvas(graphRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });
      
      const link = document.createElement('a');
      link.download = `${mission.name}_graph_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      toast({
        title: "Graph saved",
        description: "Graph image has been downloaded successfully",
      });
    } catch (error) {
      console.error('Error saving graph:', error);
      toast({
        title: "Error",
        description: "Failed to save graph image",
        variant: "destructive",
      });
    }
  };

  const exportMissionReport = async () => {
    if (!missionContentRef.current) return;

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 20;

      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Mission Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Mission details
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Mission: ${mission.name}`, 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Date: ${formatDateTime(mission.startTime)}`, 20, yPosition);
      yPosition += 5;
      pdf.text(`Duration: ${formatDurationHHMM(mission.durationMinutes)}`, 20, yPosition);
      yPosition += 5;
      pdf.text(`Measurements: ${mission.measurementsCount}`, 20, yPosition);
      yPosition += 5;
      
      if (mission.locationContext && mission.activityContext) {
        pdf.text(`Context: ${mission.locationContext} • ${mission.activityContext}`, 20, yPosition);
        yPosition += 5;
      }
      yPosition += 10;

      // Overall statistics
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Overall Statistics', 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`PM1.0: Avg ${stats.pm1.avg.toFixed(1)} µg/m³ (Min: ${stats.pm1.min.toFixed(1)}, Max: ${stats.pm1.max.toFixed(1)})`, 20, yPosition);
      yPosition += 5;
      pdf.text(`PM2.5: Avg ${stats.pm25.avg.toFixed(1)} µg/m³ (Min: ${stats.pm25.min.toFixed(1)}, Max: ${stats.pm25.max.toFixed(1)})`, 20, yPosition);
      yPosition += 5;
      pdf.text(`PM10: Avg ${stats.pm10.avg.toFixed(1)} µg/m³ (Min: ${stats.pm10.min.toFixed(1)}, Max: ${stats.pm10.max.toFixed(1)})`, 20, yPosition);
      yPosition += 15;

      // Context statistics
      Object.entries(contextStats).forEach(([contextType, stats]) => {
        if (Object.keys(stats).length === 0) return;
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Statistics by ${contextType}`, 20, yPosition);
        yPosition += 8;

        Object.entries(stats).forEach(([context, values]) => {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${context} (${formatDurationHHMM(values.timeSpent)}):`, 25, yPosition);
          yPosition += 4;
          pdf.text(`  PM1.0: ${values.pm1.toFixed(1)} µg/m³, PM2.5: ${values.pm25.toFixed(1)} µg/m³, PM10: ${values.pm10.toFixed(1)} µg/m³`, 25, yPosition);
          yPosition += 6;
        });
        yPosition += 5;
      });

      // Events
      if (events.length > 0) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Recorded Events (${events.length})`, 20, yPosition);
        yPosition += 8;

        events.forEach((event) => {
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 20;
          }
          
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          const eventTime = new Date(event.timestamp).toLocaleString();
          pdf.text(`${eventTime} - ${event.eventType || 'Event'}`, 25, yPosition);
          yPosition += 4;
          
          if (event.comment) {
            pdf.text(`  Comment: ${event.comment}`, 25, yPosition);
            yPosition += 4;
          }
          
          if (event.latitude && event.longitude) {
            pdf.text(`  Location: ${event.latitude.toFixed(6)}, ${event.longitude.toFixed(6)}`, 25, yPosition);
            yPosition += 4;
          }
          yPosition += 2;
        });
      }

      // Save PDF
      const blob = pdf.output('blob');
      downloadPDF(blob, `${mission.name}_report_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Report exported",
        description: "Mission report has been downloaded successfully",
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Error",
        description: "Failed to export mission report",
        variant: "destructive",
      });
    }
  };

  // Get the first location for map centering (if available)
  const firstLocation = mission.measurements.find(
    (m) => m.latitude && m.longitude && m.latitude !== 0 && m.longitude !== 0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" ref={missionContentRef}>
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

          {/* Graph Section - Improved mobile layout */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-lg">Évolution des particules fines (µg/m³)</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {mission.measurementsCount} points de données • Dernière mesure: {formatDateTime(mission.endTime)}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <GraphContextSelector
                mission={mission}
                selectedContextType={selectedContextType}
                onContextTypeChange={setSelectedContextType}
              />
              {/* Graph container with better mobile responsive height */}
              <div className="h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] w-full overflow-hidden" ref={graphRef}>
                <PMLineGraph 
                  data={graphData} 
                  events={events} 
                  className="h-full w-full"
                  hideTitle={true}
                  highlightContextType={selectedContextType}
                  missionContext={{
                    locationContext: mission.locationContext,
                    activityContext: mission.activityContext,
                  }}
                />
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

                    // Now using centralized getEventLabel function

                    return (
                      <div key={event.id || index} className="border rounded-lg p-3 space-y-2 bg-card">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getEventIcon(event.eventType)}
                            <span className="font-medium">
                              {getEventLabel(event.eventType)}
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
          
        </div>
      </DialogContent>
    </Dialog>
  );
}
