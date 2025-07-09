import { useState, useEffect } from "react";
import { Brain, MessageSquare, Download, Trophy, RefreshCw, Calendar, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DateFilter } from "@/components/DateFilter";
import { MapboxMap } from "@/components/MapboxMap";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { dataStorage, MissionData } from "@/lib/dataStorage";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from "date-fns";
import { useTranslation } from "react-i18next";

export default function Analysis() {
  const { t } = useTranslation();
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month" | "year">("week");
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [dataPoints, setDataPoints] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analysisGenerated, setAnalysisGenerated] = useState(false);
  const [trackPoints, setTrackPoints] = useState<Array<{
    longitude: number;
    latitude: number;
    pm25: number;
    timestamp: Date;
  }>>([]);
  const { toast } = useToast();

  // Load missions on component mount
  useEffect(() => {
    loadMissions();
  }, []);

  // Generate analysis when missions or date filter changes
  useEffect(() => {
    if (missions.length > 0 && !loading) {
      generateAnalysis();
      loadTrackPoints();
    }
  }, [missions, selectedDate, selectedPeriod]);

  const loadMissions = async () => {
    try {
      const missionData = await dataStorage.getAllMissions();
      setMissions(missionData);
    } catch (error) {
      console.error('Error loading missions:', error);
      toast({
        title: t('analysis.error'),
        description: t('analysis.errorLoadingMissions'),
        variant: "destructive"
      });
    }
  };

  const loadTrackPoints = async () => {
    try {
      const filtered = filteredMissions();
      if (filtered.length === 0) {
        setTrackPoints([]);
        return;
      }

      // Get all measurements for the filtered missions
      const allPoints: Array<{
        longitude: number;
        latitude: number;
        pm25: number;
        timestamp: Date;
      }> = [];

      for (const mission of filtered) {
        if (mission.measurements) {
          mission.measurements.forEach(measurement => {
            if (measurement.latitude && measurement.longitude) {
              allPoints.push({
                longitude: measurement.longitude,
                latitude: measurement.latitude,
                pm25: measurement.pm25,
                timestamp: measurement.timestamp
              });
            }
          });
        }
      }

      // Sort by timestamp
      allPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      setTrackPoints(allPoints);
    } catch (error) {
      console.error('Error loading track points:', error);
      setTrackPoints([]);
    }
  };

  // Filter missions based on selected date and period
  const filteredMissions = () => {
    let startDate: Date;
    let endDate: Date;

    switch (selectedPeriod) {
      case "day":
        startDate = startOfDay(selectedDate);
        endDate = endOfDay(selectedDate);
        break;
      case "week":
        startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
        endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
        break;
      case "month":
        startDate = startOfMonth(selectedDate);
        endDate = endOfMonth(selectedDate);
        break;
      case "year":
        startDate = startOfYear(selectedDate);
        endDate = endOfYear(selectedDate);
        break;
      default:
        return missions;
    }

    return missions.filter(mission => {
      const missionDate = new Date(mission.startTime);
      return isWithinInterval(missionDate, { start: startDate, end: endDate });
    });
  };

  const generateAnalysis = async () => {
    setLoading(true);
    try {
      const filtered = filteredMissions();
      
      console.log('Total missions available:', missions.length);
      console.log('Filtered missions for analysis:', filtered.length);
      console.log('Selected period:', selectedPeriod);
      console.log('Selected date:', selectedDate);
      
      if (filtered.length === 0) {
        const hasAnyMissions = missions.length > 0;
        if (hasAnyMissions) {
          setAiAnalysis(`${t(`analysis.noDataForPeriod.${selectedPeriod}`)}\n\n${t('analysis.youHaveMissions', { count: missions.length })}\n\n${t('analysis.tryTo')}\n${t('analysis.changePeriod')}\n${t('analysis.selectDifferentDate')}\n${t('analysis.goToHistory')}`);
        } else {
          setAiAnalysis(`${t('analysis.noDataAvailable')}\n\n${t('analysis.forPersonalizedAnalysis')}\n${t('analysis.goToRealTime')}\n${t('analysis.connectSensor')}\n${t('analysis.startRecording')}\n${t('analysis.comeBackHere')}`);
        }
        setDataPoints({
          totalMissions: missions.length,
          totalExposureMinutes: 0,
          averagePM25: 0,
          maxPM25: 0,
          timeAboveWHO: 0
        });
        setAnalysisGenerated(true);
        return;
      }

      const timeframeText = selectedPeriod === "day" ? t('history.periods.day') : 
                           selectedPeriod === "week" ? t('history.periods.week') : 
                           selectedPeriod === "month" ? t('history.periods.month') : t('history.periods.year');

      console.log("Calling edge function with data:", { missionsCount: filtered.length, timeframe: timeframeText });

      const response = await supabase.functions.invoke('analyze-air-quality', {
        body: {
          missions: filtered,
          timeframe: timeframeText
        }
      });

      console.log("Edge function response:", response);

      if (response.error) {
        console.error("Edge function error:", response.error);
        throw new Error(response.error.message || 'Failed to generate analysis');
      }

      if (!response.data) {
        console.error("No data in response:", response);
        throw new Error('No data received from analysis function');
      }

      setAiAnalysis(response.data.analysis || t('analysis.analysisUnavailable'));
      setDataPoints(response.data.dataPoints);
      setAnalysisGenerated(true);

      toast({
        title: t('analysis.analysisGenerated'),
        description: t('analysis.analysisReady')
      });

    } catch (error) {
      console.error('Error generating analysis:', error);
      setAiAnalysis(`${t('analysis.unableToGenerate')}\n\n${t('analysis.forPersonalizedReport')}\n${t('analysis.checkRecordedData')}\n${t('analysis.goToRealTimeForMeasures')}\n${t('analysis.comeBackInMoments')}\n\n${t('analysis.changePeriodIfPersists')}`);
      toast({
        title: t('analysis.analysisUnavailable'),
        description: t('analysis.checkDataAndRetry'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const regenerateAnalysis = () => {
    setAnalysisGenerated(false);
    generateAnalysis();
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      {/* Date Filter */}
      <DateFilter
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        className="mb-6"
      />

      {/* AI Analysis Card - temporarily hidden */}
      {/* <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              {t('analysis.title')}
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={regenerateAnalysis}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {loading ? t('analysis.analyzing') : t('analysis.refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 mx-auto text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">{t('analysis.analysisInProgress')}</p>
            </div>
          ) : (
            <>
              <div className="whitespace-pre-line text-sm text-foreground leading-relaxed">
                {aiAnalysis}
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1">
                  <MessageSquare className="h-3 w-3 mr-2" />
                  {t('analysis.askQuestion')}
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Download className="h-3 w-3 mr-2" />
                  {t('analysis.exportReport')}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card> */}

      {/* Data Points Summary */}
      {dataPoints && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {t('analysis.dataSummary')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">{dataPoints.totalMissions}</div>
                <div className="text-xs text-muted-foreground">{t('analysis.missions')}</div>
              </div>
              <div className="text-center p-3 bg-accent rounded-lg">
                <div className="text-2xl font-bold text-foreground">{Math.round(dataPoints.totalExposureMinutes / 60)}h</div>
                <div className="text-xs text-muted-foreground">{t('analysis.exposureTime')}</div>
              </div>
              <div className="text-center p-3 bg-air-moderate/10 rounded-lg">
                <div className="text-2xl font-bold text-air-moderate">{Math.round(dataPoints.averagePM25)}</div>
                <div className="text-xs text-muted-foreground">{t('analysis.averagePM25')}</div>
              </div>
              <div className="text-center p-3 bg-air-poor/10 rounded-lg">
                <div className="text-2xl font-bold text-air-poor">{Math.round(dataPoints.timeAboveWHO)}</div>
                <div className="text-xs text-muted-foreground">{t('analysis.minutesAboveWHO')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map showing collected points */}
      {trackPoints.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5 text-primary" />
              {t('analysis.mapTitle')} ({trackPoints.length} {t('analysis.points')})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-96 w-full">
              <MapboxMap
                trackPoints={trackPoints}
                isRecording={false}
                className="h-full w-full rounded-b-lg"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* WHO Threshold Progress */}
      {dataPoints && (
        <Card>
          <CardHeader>
            <CardTitle>{t('analysis.whoComplianceTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">{t('analysis.timeBelowWHO')}</span>
                  <span className="font-medium">
                    {Math.round(((dataPoints.totalExposureMinutes - dataPoints.timeAboveWHO) / dataPoints.totalExposureMinutes) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={((dataPoints.totalExposureMinutes - dataPoints.timeAboveWHO) / dataPoints.totalExposureMinutes) * 100} 
                  className="h-3" 
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('analysis.whoRecommendation')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}